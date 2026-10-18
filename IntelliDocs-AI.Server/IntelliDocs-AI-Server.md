# IntelliDocs AI --- ASP.NET Core Server Setup & RAG Workflow

> **Purpose:** This document records how the `IntelliDocs-AI.Server`
> backend was created, configured, tested, and connected to Azure AI
> services. Use it as a repeatable setup/runbook when creating a similar
> project from scratch.
>
> **Current status:** Core PDF ingestion and RAG chat flow tested
> locally. Angular frontend already has a working document-upload UI/API
> integration; chat UI integration is a separate next phase.
>
> **Security:** Never commit API keys, Search admin keys, passwords, or
> real User Secrets. Values shown below are placeholders unless
> explicitly described as resource names/endpoints.

------------------------------------------------------------------------

## 1. Project overview

**Project:** IntelliDocs AI --- enterprise-style AI document assistant\
**Repository root:** `IntelliDocs-AI`\
**Frontend:** `IntelliDocs-AI.Web` --- Angular 22\
**Backend:** `IntelliDocs-AI.Server` --- ASP.NET Core Web API, targeting
`net10.0`\
**AI pattern:** Retrieval-Augmented Generation (RAG)\
**Document parsing:** PdfPig\
**Embedding model deployment:** `text-embedding-3-small` (1536
dimensions)\
**Chat model deployment:** `gpt-4.1-mini-1`\
**Vector store/retrieval:** Azure AI Search

### What the server does

1.  Accepts document uploads through `POST /api/Documents/upload`.
2.  Saves uploaded files locally and returns document metadata.
3.  For PDFs, extracts text page by page and splits it into overlapping
    chunks.
4.  Creates an embedding vector for each chunk with Azure OpenAI.
5.  Uploads chunks and vectors into Azure AI Search.
6.  Receives questions through `POST /api/Chat`.
7.  Embeds the question, retrieves relevant chunks using vector search,
    and sends the context to the chat model.
8.  Returns an answer and source filenames/page numbers.

### High-level architecture

``` mermaid
flowchart TD
    U[User] --> UI[Angular 22 Web UI]
    UI -->|multipart/form-data| API[ASP.NET Core Web API]
    API --> STORE[Local Document Storage]
    API --> PDF[PdfProcessingService]
    PDF --> CHUNKS[Text chunks per PDF page]
    CHUNKS --> EMB[EmbeddingService]
    EMB --> AOAI1[Azure OpenAI: text-embedding-3-small]
    AOAI1 --> VECTORS[1536-dimensional vectors]
    VECTORS --> SEARCH[Azure AI Search: intellidocs-chunks]
    UI -->|POST /api/Chat: question| CHAT[ChatController]
    CHAT --> QEMB[EmbeddingService: query vector]
    QEMB --> AOAI1
    QEMB --> VS[AzureSearchService: vector search]
    SEARCH --> VS
    VS --> CTX[Relevant document chunks]
    CTX --> CS[ChatService]
    CS --> AOAI2[Azure OpenAI: gpt-4.1-mini-1]
    AOAI2 --> ANSWER[Answer + source file/page list]
    ANSWER --> UI
```

### PDF ingestion sequence

``` mermaid
sequenceDiagram
    actor User
    participant API as DocumentsController
    participant Store as IDocumentStorageService
    participant PDF as PdfProcessingService
    participant Embed as EmbeddingService
    participant Search as AzureSearchService
    User->>API: POST /api/Documents/upload (PDF)
    API->>Store: SaveAsync(file)
    Store-->>API: Document metadata + StoragePath
    API->>PDF: ProcessPdf(path, documentId, fileName)
    PDF-->>API: List<DocumentChunk>
    loop Each chunk
        API->>Embed: GenerateEmbeddingAsync(chunkText)
        Embed-->>API: float[1536]
    end
    API->>Search: UploadChunksAsync(chunks)
    Search-->>API: Index operation complete
    API-->>User: 201 Created + DocumentDto
```

### Chat/RAG sequence

``` mermaid
sequenceDiagram
    actor User
    participant API as ChatController
    participant Embed as EmbeddingService
    participant Search as AzureSearchService
    participant Chat as ChatService
    participant AOAI as Azure OpenAI
    User->>API: POST /api/Chat { question }
    API->>Embed: GenerateEmbeddingAsync(question)
    Embed->>AOAI: Create query embedding
    AOAI-->>Embed: 1536-dimensional vector
    API->>Search: SearchSimilarChunksAsync(vector, top=5)
    Search-->>API: Relevant chunks
    API->>Chat: GetAnswerAsync(question, chunks)
    Chat->>AOAI: Chat completion with document context
    AOAI-->>Chat: Grounded answer
    API-->>User: 200 OK { answer, sources[] }
```

------------------------------------------------------------------------

## 2. Azure resources

These are the resource names used in the working setup. For a new
environment, create equivalent resources and update configuration
values.

  -----------------------------------------------------------------------------------------------------
  Resource                Value used                                            Notes
  ----------------------- ----------------------------------------------------- -----------------------
  Resource group          `rg-intellidocs-dev`                                  Development resource
                                                                                group

  Azure AI Foundry        `IntelliDocs-AI`                                      Project used to manage
  project                                                                       model deployments

  Chat deployment         `gpt-4.1-mini-1`                                      Exact **deployment
                                                                                name** configured in
                                                                                User Secrets

  Embedding deployment    `text-embedding-3-small`                              Exact deployment name;
                                                                                expected vector length
                                                                                1536

  Azure AI Search service `intellidocs-search-dev`                              Free tier, Central
                                                                                India

  Search endpoint         `https://intellidocs-search-dev.search.windows.net`   Search service endpoint

  Search index            `intellidocs-chunks`                                  Stores one search
                                                                                document per text chunk

  Vector profile          `intellidocs-vector-profile`                          HNSW + cosine
                                                                                similarity, 1536
                                                                                dimensions
  -----------------------------------------------------------------------------------------------------

### Search index schema

Create an index named `intellidocs-chunks` with these fields. Field
names and types must match the names used by `AzureSearchService`.

  ---------------------------------------------------------------------------------
  Field                   Type                       Purpose / suggested flags
  ----------------------- -------------------------- ------------------------------
  `id`                    `Edm.String`               Key; unique chunk ID

  `documentId`            `Edm.String`               Source document GUID as a
                                                     string; retrievable/filterable

  `fileName`              `Edm.String`               Original filename;
                                                     searchable/retrievable

  `pageNumber`            `Edm.Int32`                PDF page number;
                                                     retrievable/filterable

  `chunkText`             `Edm.String`               Extracted chunk text;
                                                     searchable/retrievable

  `contentVector`         `Collection(Edm.Single)`   1536-dimensional vector field;
                                                     vector profile
                                                     `intellidocs-vector-profile`
  ---------------------------------------------------------------------------------

Vector configuration: - Algorithm: HNSW - Similarity metric: cosine -
Dimensions: 1536 - Vector profile: `intellidocs-vector-profile`

**Important:** Ensure the vector field's configured dimensions match the
embedding deployment. If you change embedding models, check the new
model's dimensions and rebuild/reindex the index as needed.

------------------------------------------------------------------------

## 3. Create the server project from scratch

Use PowerShell in the repository root.

``` powershell
mkdir IntelliDocs-AI
cd IntelliDocs-AI

dotnet new webapi -n IntelliDocs-AI.Server
cd IntelliDocs-AI.Server
```

If the project is created with a template that includes sample
WeatherForecast files, remove those samples if they are not needed.

Confirm the target framework in `IntelliDocs-AI.Server.csproj`:

``` xml
<TargetFramework>net10.0</TargetFramework>
```

### Install NuGet packages

The versions in the working project were:

``` powershell
dotnet add package Azure.AI.OpenAI --version 2.1.0
dotnet add package Azure.Identity --version 1.21.0
dotnet add package Azure.Search.Documents --version 12.0.0
dotnet add package PdfPig --version 0.1.16
dotnet add package Swashbuckle.AspNetCore --version 6.6.2
```

> **SDK compatibility note:** The chat implementation initially threw a
> `MissingMethodException` inside `CompleteChatAsync`. The direct
> `OpenAI` package reference was removed during troubleshooting, after
> which the chat endpoint returned `200 OK`. Do not blindly
> add/remove/upgrade SDK packages. After reproducing the project, run
> `dotnet list package --include-transitive`, test chat completion, and
> retain a known-good dependency set. Package resolution can differ by
> project/runtime.

Verify:

``` powershell
dotnet list package --include-transitive
dotnet build
```

------------------------------------------------------------------------

## 4. Suggested folder structure

The implementation used these responsibilities. Folder names may differ,
but C# namespaces must match the `namespace` declarations in each file.

``` text
IntelliDocs-AI/
├── IntelliDocs-AI.Web/                  # Angular frontend
└── IntelliDocs-AI.Server/
    ├── Controllers/
    │   ├── DocumentsController.cs
    │   └── ChatController.cs
    ├── Models/
    │   ├── Document.cs
    │   ├── DocumentDto.cs
    │   ├── UploadDocumentResponse.cs
    │   └── DocumentChunk.cs
    ├── Services/
    │   ├── IDocumentStorageService.cs
    │   ├── LocalDocumentStorageService.cs
    │   └── AI-Services/
    │       ├── PdfProcessingService.cs
    │       ├── EmbeddingService.cs
    │       ├── AzureSearchService.cs
    │       └── ChatService.cs
    ├── Properties/
    ├── Program.cs
    └── IntelliDocs-AI.Server.csproj
```

The folder may be named `AI-Services`, but a C# namespace cannot contain
a hyphen. The service files used:

``` csharp
namespace IntelliDocs_AI.Server.Services.AI_Services;
```

Use this namespace consistently in all AI service files and `using`
statements.

------------------------------------------------------------------------

## 5. Configuration and secret management

Use **User Secrets** for local development. Never paste real keys into
this Markdown file, source code, Git commits, screenshots, or chat.

Initialize User Secrets:

``` powershell
dotnet user-secrets init
dotnet user-secrets set "AzureOpenAI:Endpoint" "https://YOUR-RESOURCE.openai.azure.com/"
dotnet user-secrets set "AzureOpenAI:ApiKey" "YOUR_AZURE_OPENAI_KEY"
dotnet user-secrets set "AzureOpenAI:EmbeddingDeployment" "text-embedding-3-small"
dotnet user-secrets set "AzureOpenAI:ChatDeployment" "gpt-4.1-mini-1"

dotnet user-secrets set "AzureSearch:Endpoint" "https://intellidocs-search-dev.search.windows.net"
dotnet user-secrets set "AzureSearch:ApiKey" "YOUR_SEARCH_ADMIN_KEY"
dotnet user-secrets set "AzureSearch:IndexName" "intellidocs-chunks"
```

Alternatively, use Visual Studio's **Manage User Secrets** and enter:

``` json
{
  "AzureOpenAI": {
    "Endpoint": "https://YOUR-RESOURCE.openai.azure.com/",
    "ApiKey": "REPLACE_LOCALLY",
    "EmbeddingDeployment": "text-embedding-3-small",
    "ChatDeployment": "gpt-4.1-mini-1"
  },
  "AzureSearch": {
    "Endpoint": "https://intellidocs-search-dev.search.windows.net",
    "ApiKey": "REPLACE_LOCALLY",
    "IndexName": "intellidocs-chunks"
  }
}
```

### Configuration checks

-   The Azure OpenAI endpoint must belong to the Azure OpenAI resource
    that hosts the deployments. Do not substitute a project URL that is
    not accepted by the SDK constructor.
-   `EmbeddingDeployment` and `ChatDeployment` must be the **deployment
    names**, not just the underlying model family names.
-   Confirm both deployments exist and are in a usable state.
-   Keep `ApiKey` secret. Do not return it from any API.
-   For production, prefer managed identity / Microsoft Entra ID where
    configured, plus a secure secret store such as Azure Key Vault. Use
    least-privilege credentials when possible.

------------------------------------------------------------------------

## 6. Core models

### `Models/DocumentChunk.cs`

``` csharp
namespace IntelliDocs_AI.Server.Models;

public class DocumentChunk
{
    public string Id { get; set; } = string.Empty;
    public Guid DocumentId { get; set; }
    public string FileName { get; set; } = string.Empty;
    public int PageNumber { get; set; }
    public string ChunkText { get; set; } = string.Empty;
    public float[] ContentVector { get; set; } = [];
}
```

The `DocumentId` GUID is serialized to a string when stored in Azure AI
Search.

### Document metadata model

The existing `Document` model contains:

-   `Id` (`Guid`)
-   `FileName`
-   `OriginalFileName`
-   `ContentType`
-   `SizeBytes`
-   `UploadedAt`
-   `StoragePath`

`DocumentDto` is the API-safe metadata response and contains `Id`,
`FileName`, `ContentType`, `SizeBytes`, `UploadedAt`, and `DownloadUrl`.

`UploadDocumentResponse` contains `Success`, `Message`, and the returned
`DocumentDto`.

------------------------------------------------------------------------

## 7. Document storage service

### `IDocumentStorageService.cs`

The interface used by the controller:

``` csharp
using IntelliDocs_AI.Server.Models;

namespace IntelliDocs_AI.Server.Services;

public interface IDocumentStorageService
{
    Task<Document> SaveAsync(IFormFile file, CancellationToken ct = default);
    Task<(Stream stream, Document document)?> GetAsync(
        Guid id, CancellationToken ct = default);
    IReadOnlyList<Document> GetAll();
    bool Delete(Guid id);
}
```

### `LocalDocumentStorageService.cs`

The local implementation: - Creates an upload directory under
`wwwroot/uploads`. - Saves files with generated GUID-based filenames. -
Keeps document metadata in an in-memory dictionary. - Enforces allowed
document extensions/content types and a 50 MB maximum in the current
prototype. - Returns a `Document` with its `StoragePath`. - Implements
get/list/download/delete operations.

Current implementation registration:

``` csharp
builder.Services.AddSingleton<IDocumentStorageService, LocalDocumentStorageService>();
```

**Prototype limitations to address before production:** - The metadata
dictionary is in-memory and is lost when the server restarts. - A normal
`Dictionary<Guid, Document>` is not thread-safe for concurrent writes. -
Saving private documents under `wwwroot` can expose files through
static-file serving. Move private uploads outside `wwwroot` and serve
downloads through authorized API endpoints. - Validate actual file
content/signatures, not only filename/content type. - Consider
persistent metadata (database), file-size limits at every hosting layer,
antivirus/content scanning, authorization, and cleanup policies.

------------------------------------------------------------------------

## 8. PDF extraction and chunking

### `PdfProcessingService.cs`

PdfPig extracts selectable text page by page. The current prototype uses
character-based chunking: - Chunk size: 2500 characters - Overlap: 250
characters - Page number stored with each chunk - A new chunk ID is
generated for every chunk - Empty pages are skipped

Core implementation:

``` csharp
using IntelliDocs_AI.Server.Models;
using UglyToad.PdfPig;

namespace IntelliDocs_AI.Server.Services.AI_Services;

public class PdfProcessingService
{
    private const int ChunkSize = 2500;
    private const int ChunkOverlap = 250;

    public IReadOnlyList<DocumentChunk> ProcessPdf(
        string filePath,
        Guid documentId,
        string fileName,
        CancellationToken cancellationToken = default)
    {
        var chunks = new List<DocumentChunk>();
        using var pdf = PdfDocument.Open(filePath);

        foreach (var page in pdf.GetPages())
        {
            cancellationToken.ThrowIfCancellationRequested();

            var text = page.Text;
            if (string.IsNullOrWhiteSpace(text))
                continue;

            foreach (var chunkText in SplitText(text))
            {
                chunks.Add(new DocumentChunk
                {
                    Id = Guid.NewGuid().ToString(),
                    DocumentId = documentId,
                    FileName = fileName,
                    PageNumber = page.Number,
                    ChunkText = chunkText
                });
            }
        }

        return chunks;
    }

    private static IEnumerable<string> SplitText(string text)
    {
        var start = 0;

        while (start < text.Length)
        {
            var length = Math.Min(ChunkSize, text.Length - start);
            var chunk = text.Substring(start, length).Trim();

            if (!string.IsNullOrWhiteSpace(chunk))
                yield return chunk;

            if (start + length >= text.Length)
                yield break;

            start += ChunkSize - ChunkOverlap;
        }
    }
}
```

**Important:** This is character-based splitting, not token-based
splitting. Scanned/image-only PDFs may produce no text and need an OCR
service. Consider chunking by headings/paragraphs and token limits for
better retrieval quality.

------------------------------------------------------------------------

## 9. Embedding service

### `EmbeddingService.cs`

Responsibilities: - Reads endpoint, key, and embedding deployment from
configuration. - Creates `AzureOpenAIClient`. - Gets an embedding client
for the configured deployment. - Converts text into a `float[]` vector.

The working pattern was:

``` csharp
using Azure;
using Azure.AI.OpenAI;
using Microsoft.Extensions.Configuration;
using OpenAI.Embeddings;

namespace IntelliDocs_AI.Server.Services.AI_Services;

public class EmbeddingService
{
    private readonly EmbeddingClient _client;

    public EmbeddingService(IConfiguration configuration)
    {
        var endpoint = configuration["AzureOpenAI:Endpoint"]
            ?? throw new InvalidOperationException(
                "Azure OpenAI endpoint is not configured.");
        var apiKey = configuration["AzureOpenAI:ApiKey"]
            ?? throw new InvalidOperationException(
                "Azure OpenAI API key is not configured.");
        var deployment = configuration["AzureOpenAI:EmbeddingDeployment"]
            ?? throw new InvalidOperationException(
                "Embedding deployment is not configured.");

        var azureClient = new AzureOpenAIClient(
            new Uri(endpoint),
            new AzureKeyCredential(apiKey));

        _client = azureClient.GetEmbeddingClient(deployment);
    }

    public async Task<float[]> GenerateEmbeddingAsync(
        string text,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(text))
            throw new ArgumentException("Text cannot be empty.", nameof(text));

        var result = await _client.GenerateEmbeddingAsync(
            text, cancellationToken: cancellationToken);

        return result.Value.ToFloats().ToArray();
    }
}
```

Successful test log showed a generated vector with **1536 dimensions**.
If embedding calls return HTTP 404, verify endpoint, deployment name,
deployment state, and that the deployment belongs to that resource.

------------------------------------------------------------------------

## 10. Azure AI Search service

### Upload/index chunks

`AzureSearchService` creates a `SearchClient` using: -
`AzureSearch:Endpoint` - `AzureSearch:ApiKey` - `AzureSearch:IndexName`

For each chunk, it uploads fields:

``` text
id
documentId
fileName
pageNumber
chunkText
contentVector
```

The index field names must match the index schema exactly. The
implementation batches uploads and checks per-item success results;
failed indexing operations throw an exception.

### Vector search

`SearchSimilarChunksAsync(queryVector, top: 5)`: 1. Creates
`SearchOptions` with `Size = top`. 2. Selects `id`, `documentId`,
`fileName`, `pageNumber`, and `chunkText`. 3. Configures
`VectorSearchOptions`. 4. Uses `VectorizedQuery(queryVector)` with
`KNearestNeighborsCount = top` and field `contentVector`. 5. Calls
`_searchClient.SearchAsync<SearchDocument>("*", options, cancellationToken)`.
6. Maps results into `DocumentChunk` objects.

The `"*"` argument is the search query string; the vector query is
configured in `options.VectorSearch`.

**Retrieval quality improvement:** Current code returns the top `K`
vector matches. Add a similarity/relevance threshold if supported by
your selected query strategy, filter by document when the user chooses a
specific document, and test results with both relevant and unrelated
questions.

------------------------------------------------------------------------

## 11. Chat service

### `ChatService.cs`

Responsibilities: - Reads `AzureOpenAI:Endpoint`, `AzureOpenAI:ApiKey`,
and `AzureOpenAI:ChatDeployment`. - Gets a chat client for the chat
deployment. - Combines retrieved chunks into a context string containing
filename and page number. - Sends a system instruction requiring answers
to use only the provided document context. - Returns the generated
answer text.

The key grounding instruction is:

> Answer using only the provided document context. If the context does
> not contain the answer, say so. Do not invent facts.

This instruction improves grounding but is not a complete security
boundary. Retrieved text is untrusted input; consider explicitly
instructing the model to treat document content as data, not
instructions.

### SDK troubleshooting note

During development, `CompleteChatAsync` initially failed with a
`System.MissingMethodException` referring to
`ChatCompletionOptions.get_SerializedAdditionalRawData()`.
`dotnet clean`, `dotnet restore`, and `dotnet build` all succeeded but
did not fix the runtime error by themselves. The issue was resolved
during package troubleshooting by removing the direct `OpenAI` package
reference, after which the chat endpoint returned `200 OK`.

If recreating: 1. Inspect `IntelliDocs-AI.Server.csproj`. 2. Run
`dotnet list package --include-transitive`. 3. Restore/build. 4. Test
the chat call at runtime. 5. Keep the exact dependency combination that
passes the chat integration test; do not assume compile success
guarantees runtime assembly compatibility.

------------------------------------------------------------------------

## 12. Documents API

Controller route: `api/Documents`

  --------------------------------------------------------------------------------
  Method                  Route                            Purpose
  ----------------------- -------------------------------- -----------------------
  `GET`                   `/api/Documents`                 List stored document
                                                           metadata

  `GET`                   `/api/Documents/{id}`            Get document metadata
                                                           by GUID

  `GET`                   `/api/Documents/{id}/download`   Download stored file

  `POST`                  `/api/Documents/upload`          Upload a document; PDF
                                                           triggers RAG ingestion

  `DELETE`                `/api/Documents/{id}`            Delete local document
  --------------------------------------------------------------------------------

### Upload behavior

-   Uses `IFormFile file`.
-   Rejects null/empty files.
-   Request size limit in controller: `52_428_800` bytes (50 MiB).
-   Calls `IDocumentStorageService.SaveAsync`.
-   If the extension is `.pdf`, calls `PdfProcessingService`, generates
    embeddings for every chunk, and uploads the chunks to Azure AI
    Search.
-   Returns `201 Created` with `UploadDocumentResponse` and a document
    DTO.

### Important current behavior/caveats

-   Word, Excel, PowerPoint, and TXT may be accepted by local storage,
    but the RAG ingestion path currently processes only PDFs.
-   If embedding or indexing fails after the local save succeeds, the
    file can remain stored while the API returns an error.
-   If a PDF has no selectable text, it can produce zero chunks.
    Consider returning an explicit ingestion status or message.
-   The current `DELETE` implementation deletes the local file/metadata
    but does **not yet delete its chunks from Azure AI Search**.
    Implement index cleanup by filtering on `documentId` before treating
    deletion as complete.

------------------------------------------------------------------------

## 13. Chat API

Controller route: `api/Chat`

### Request

`POST /api/Chat`

``` json
{
  "question": "What are my .NET skills?"
}
```

### Successful response shape

``` json
{
  "answer": "Your .NET skills, as outlined in your CV, include ...",
  "sources": [
    "Sushil_Thakur_CV_AI_FullStack.pdf (Page 1)",
    "Sushil_Thakur_CV_AI_FullStack.pdf (Page 2)"
  ]
}
```

### Chat flow

1.  Validate the question is not empty.
2.  Generate an embedding for the question.
3.  Run Azure AI Search vector search (`top = 5`).
4.  If no chunks are returned, respond that no relevant information was
    found in uploaded documents.
5.  Otherwise, call `ChatService.GetAnswerAsync(question, chunks)`.
6.  Return `answer` and distinct source file/page labels.

The controller logs each stage during debugging: - Step 1: Generating
question embedding - Embedding generated + vector dimensions - Step 2:
Searching Azure AI Search - Number of chunks returned - Step 3:
Generating chat answer - Chat answer generated

Do not log secret values or complete confidential document text.

------------------------------------------------------------------------

## 14. Program.cs configuration

The current setup includes controllers, Swagger, CORS, static files,
authorization middleware, and dependency injection.

A representative configuration:

``` csharp
using IntelliDocs_AI.Server.Services;
using IntelliDocs_AI.Server.Services.AI_Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddSingleton<IDocumentStorageService, LocalDocumentStorageService>();
builder.Services.AddSingleton<PdfProcessingService>();
builder.Services.AddSingleton<EmbeddingService>();
builder.Services.AddSingleton<AzureSearchService>();
builder.Services.AddSingleton<ChatService>();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AngularApp", policy =>
        policy.WithOrigins(
                "http://localhost:4200",
                "https://localhost:4200")
            .AllowAnyHeader()
            .AllowAnyMethod());
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}
else
{
    app.UseHttpsRedirection();
}

app.UseCors("AngularApp");
app.UseStaticFiles();
app.UseAuthorization();
app.MapControllers();

app.Run();
```

This is a reference template. Preserve any working Swagger setup, HTTPS
settings, and other project-specific configuration already in your
source. In production, use authentication/authorization and avoid
exposing private upload files through static file middleware.

------------------------------------------------------------------------

## 15. Run the project locally

From `IntelliDocs-AI.Server`:

``` powershell
dotnet restore
dotnet build
dotnet run
```

The local server used these URLs in development:

-   `https://localhost:7002`
-   `http://localhost:5002`

Ports can differ depending on `Properties/launchSettings.json`.

Open Swagger at the HTTPS base URL plus `/swagger`, for example:

``` text
https://localhost:7002/swagger
```

If the ports change, use the URLs printed by `dotnet run`.

------------------------------------------------------------------------

## 16. End-to-end verification checklist

### A. Build

``` powershell
dotnet clean
dotnet restore
dotnet build
```

Expected: build succeeds.

### B. Upload a text-based PDF

Use Swagger `POST /api/Documents/upload`, select a small PDF with
selectable text.

Expected: - `201 Created` - `success: true` - document metadata in the
response - terminal log says the document was indexed and shows a chunk
count

### C. Verify Azure AI Search

In Azure Portal: 1. Open Search service `intellidocs-search-dev`. 2.
Open index `intellidocs-chunks`. 3. Open **Search explorer**. 4. Search
for `*`. 5. Verify `fileName`, `pageNumber`, `chunkText`, and
`contentVector` are present. 6. Check that the latest PDF appears.

The working test showed 4 index documents and the CV filename/content
with numerical values in `contentVector`.

### D. Ask a question answerable from the uploaded PDF

`POST /api/Chat`:

``` json
{
  "question": "What are my .NET skills?"
}
```

Expected: `200 OK`, answer text, and source filenames/pages.

### E. Ask a question not covered by the documents

``` json
{
  "question": "What is the capital of Japan?"
}
```

Expected behavior: the model says the provided document context does not
contain the answer, rather than inventing a document-based answer. The
working test returned that message.

### F. Troubleshooting guide

  -----------------------------------------------------------------------
  Symptom                             Check
  ----------------------------------- -----------------------------------
  Embedding returns HTTP 404          Azure OpenAI endpoint, exact
                                      embedding deployment name,
                                      resource/deployment status

  Search returns no chunks            Index name, schema field names,
                                      whether PDF had extractable text,
                                      whether chunks were indexed

  Search index upload fails           Search endpoint/key, index schema,
                                      vector profile/dimensions,
                                      item-level index errors

  Chat endpoint returns 500           Terminal exception; log which stage
                                      failed

  `MissingMethodException` during     Resolved/transitive NuGet versions
  chat completion                     and runtime compatibility; clean
                                      build alone may not fix it

  Angular CORS error                  Angular origin matches CORS policy,
                                      API is running on expected port

  PDF creates zero chunks             It may be scanned/image-only; add
                                      OCR or use a text-based PDF

  Uploaded file remains after failed  Add cleanup/retry/ingestion-status
  ingestion                           logic
  -----------------------------------------------------------------------

------------------------------------------------------------------------

## 17. Current implementation boundaries

Working prototype: - Local file upload and download - PDF text
extraction and chunking - Embeddings with Azure OpenAI - Chunk indexing
and vector search in Azure AI Search - RAG chat response with source
filenames/page numbers - Swagger-tested APIs

Not yet fully production-ready: - Angular chat UI integration (document
upload UI/API already exists) - Persistent document metadata database -
Private object/file storage outside `wwwroot` - Delete corresponding
Azure Search chunks when deleting a document - OCR for scanned PDFs -
Non-PDF ingestion pipeline (current RAG ingestion only handles PDF) -
Authorization, tenant/user-level document isolation, rate limiting, and
comprehensive validation - Retry/background processing for large
uploads - Automated tests and deployment/CI/CD - Relevance
threshold/reranking and retrieval evaluation

------------------------------------------------------------------------

## 18. Recommended next steps

1.  Build Angular chat interface and connect it to `POST /api/Chat`.
2.  Show source filename and page citations beneath every answer.
3.  Add index cleanup when a document is deleted.
4.  Move uploads outside `wwwroot` and persist metadata in a database.
5.  Add OCR and support additional file formats deliberately, one format
    at a time.
6.  Add tests for upload, ingestion failures, vector retrieval,
    no-context answers, and deletion.
7.  Move secrets to Key Vault/managed identity and deploy with
    monitoring.

------------------------------------------------------------------------

## 19. Quick rebuild checklist for a new environment

-   [ ] Install .NET SDK compatible with `net10.0` and Node.js/Angular
    tooling.
-   [ ] Create `IntelliDocs-AI.Server` Web API.
-   [ ] Install and verify compatible NuGet packages.
-   [ ] Create Azure AI Foundry/Azure OpenAI resource and chat/embedding
    deployments.
-   [ ] Create Azure AI Search service and `intellidocs-chunks` index
    with vector profile.
-   [ ] Configure local User Secrets.
-   [ ] Add models, storage interface/implementation, PDF processor,
    embedding/search/chat services.
-   [ ] Register services in `Program.cs`.
-   [ ] Add Documents and Chat controllers.
-   [ ] Run `dotnet restore`, `dotnet build`, and `dotnet run`.
-   [ ] Test PDF upload and confirm index documents.
-   [ ] Test a document-based question and an unrelated question.
-   [ ] Record the verified SDK/package versions and Azure resource
    configuration for that environment.
-   [ ] Never commit real keys or confidential uploaded documents.

**End of runbook.**

---

## 20. Azure setup from scratch — portal walkthrough

This section explains how to create the Azure resources required by IntelliDocs AI in a new Azure subscription or development environment. Portal labels can change slightly over time, so use the resource search bar if a menu has moved.

### 20.1 Prerequisites and planning

Before creating resources:

- Sign in to the Azure portal: <https://portal.azure.com/>.
- Confirm that your subscription is active and that you have permission to create Azure AI services and Azure AI Search resources.
- Check model availability and quota for your chosen Azure region before selecting a region.
- Decide on a consistent naming convention and keep a note of resource names, regions, deployment names, and endpoints. Never record secret keys in this Markdown file.

Example development naming:

| Resource | Example name |
|---|---|
| Resource group | `rg-intellidocs-dev` |
| Azure AI Foundry resource/project | `IntelliDocs-AI` |
| Azure AI Search service | `intellidocs-search-dev` |
| Search index | `intellidocs-chunks` |
| Chat deployment | `gpt-4.1-mini-1` |
| Embedding deployment | `text-embedding-3-small` |

Resource names must be available and satisfy Azure naming rules. The examples are not guaranteed to be available in every subscription or region.

### 20.2 Create a resource group

1. In Azure Portal, search for **Resource groups**.
2. Select **Create**.
3. Choose the correct subscription.
4. Enter a resource group name such as `rg-intellidocs-dev`.
5. Choose a region that is appropriate for your project and available services.
6. Select **Review + create**, then **Create**.
7. Open the resource group. Create the AI resources in this group where practical so that development resources are easier to find and clean up.

### 20.3 Create the Azure AI Foundry / Azure OpenAI resource

Azure portal navigation and product terminology can change. Depending on the current portal experience, start from **Azure AI Foundry** or create an **Azure OpenAI** resource from the Azure Marketplace/resource creation page.

1. Open Azure AI Foundry: <https://ai.azure.com/> or find the relevant AI service in Azure Portal.
2. Create or select an AI resource/project supported by Azure OpenAI model deployments.
3. Select the subscription and resource group created above.
4. Choose a region where the required models are available and quota is sufficient.
5. Complete creation and open the resource/project.
6. In the model catalog/deployment experience, find the chat model you plan to use. In the working environment, the chat deployment name was `gpt-4.1-mini-1`.
7. Deploy the chat model. Set the **deployment name** to the name you will put in `AzureOpenAI:ChatDeployment`. The deployment name is the name the SDK calls; it is not necessarily identical to the model family name.
8. Return to the model catalog and deploy an embedding model. The working deployment was `text-embedding-3-small`.
9. Record both exact deployment names and the resource endpoint. Do not assume the model is deployed just because it appears in the catalog; confirm deployment status is ready/succeeded.
10. Confirm quota/capacity for both deployments.

**Endpoint guidance:** For the current `AzureOpenAIClient` code, configure the endpoint associated with the Azure OpenAI resource that owns these deployments, for example `https://YOUR-RESOURCE.openai.azure.com/` if that is the endpoint shown for your resource. Do not copy a project-specific URL or an unrelated endpoint unless the SDK/API you use explicitly supports it.

**Deployment checklist:**
- [ ] Chat model deployment exists and is ready.
- [ ] Embedding model deployment exists and is ready.
- [ ] Chat deployment name is recorded exactly.
- [ ] Embedding deployment name is recorded exactly.
- [ ] Endpoint belongs to the same resource as the deployments.
- [ ] Key is stored only in User Secrets or another secret store.

### 20.4 Get the Azure OpenAI endpoint and key

1. In Azure Portal, open the Azure OpenAI resource that hosts the deployments.
2. Find **Keys and Endpoint** (or the equivalent resource page).
3. Copy the endpoint and a key for local development.
4. Store these values in User Secrets, not in `appsettings.json`, source code, or this Markdown document.
5. If your organization uses Microsoft Entra ID/managed identity, prefer that approach where supported and configured rather than distributing API keys.

Do not share keys in screenshots, GitHub, logs, or chat messages. If a key is exposed, rotate it in Azure.

### 20.5 Create Azure AI Search

1. In Azure Portal, search for **Azure AI Search**.
2. Select **Create**.
3. Choose the subscription and `rg-intellidocs-dev` resource group.
4. Enter a unique service name such as `intellidocs-search-dev`.
5. Select a region and pricing tier that meet the project requirements. The original development setup used the Free tier in Central India; availability and features vary by region/tier.
6. Create the service and wait until provisioning completes.
7. Open the service's **Overview** page and copy the endpoint. The working endpoint was `https://intellidocs-search-dev.search.windows.net`.
8. Open **Keys** (or equivalent) and copy an admin key for local development. Keep it secret. For production, use managed identity and role-based access where possible, rather than an admin key in the application.

### 20.6 Create the vector index

1. Open the Azure AI Search service.
2. Select **Indexes** and create a new index named `intellidocs-chunks`.
3. Add the fields below. Names, types, key designation, and vector settings must match the server code.

| Field | Type | Key | Searchable | Filterable | Retrievable |
|---|---|---:|---:|---:|---:|
| `id` | `Edm.String` | Yes | No | No | Yes |
| `documentId` | `Edm.String` | No | No | Yes | Yes |
| `fileName` | `Edm.String` | No | Yes | Optional | Yes |
| `pageNumber` | `Edm.Int32` | No | No | Yes | Yes |
| `chunkText` | `Edm.String` | No | Yes | No | Yes |
| `contentVector` | `Collection(Edm.Single)` | No | No | No | Usually not needed for result display |

For `contentVector`:
- Set vector dimensions to **1536** to match the `text-embedding-3-small` deployment used here.
- Create/select a vector profile named `intellidocs-vector-profile`.
- Configure an HNSW vector algorithm and cosine similarity metric.
- Assign the vector profile to the `contentVector` field.

Portal UI details may vary. If creating the index through **Edit JSON**, ensure the vector field has the vector-search profile assigned and the profile references the configured HNSW algorithm. Save the index.

**Schema validation:** The field names in the index must match the names used by `AzureSearchService` exactly. If you use another embedding model/dimension, update the index configuration and re-index the chunks. Do not mix vectors produced by different embedding models in the same vector field.

### 20.7 Configure User Secrets for the server

Open a terminal in `IntelliDocs-AI.Server`:

```powershell
dotnet user-secrets init

dotnet user-secrets set "AzureOpenAI:Endpoint" "https://YOUR-RESOURCE.openai.azure.com/"
dotnet user-secrets set "AzureOpenAI:ApiKey" "YOUR_AZURE_OPENAI_KEY"
dotnet user-secrets set "AzureOpenAI:EmbeddingDeployment" "text-embedding-3-small"
dotnet user-secrets set "AzureOpenAI:ChatDeployment" "gpt-4.1-mini-1"

dotnet user-secrets set "AzureSearch:Endpoint" "https://YOUR-SEARCH-SERVICE.search.windows.net"
dotnet user-secrets set "AzureSearch:ApiKey" "YOUR_SEARCH_ADMIN_KEY"
dotnet user-secrets set "AzureSearch:IndexName" "intellidocs-chunks"
```

Replace placeholder values with the values from your own resources. Do not include quotation marks as part of the values. If User Secrets were already initialized for this project, do not run `dotnet user-secrets init` again unnecessarily.

Check that the keys exist without printing their values in a shared terminal or screenshot. The app reads these settings through `IConfiguration`.

### 20.8 Verify Azure connectivity in a safe order

Run from the server project:

```powershell
dotnet restore
dotnet build
dotnet run
```

Then verify in this order:

1. **Embedding check:** Upload a small text-based PDF through Swagger. If the log shows HTTP 404 from Azure OpenAI, verify the exact endpoint and embedding deployment name.
2. **Search indexing check:** Open the Search service → `intellidocs-chunks` → **Search explorer**, run `*`, and confirm `fileName`, `pageNumber`, `chunkText`, and indexed records are present.
3. **Vector query check:** Send a question answerable from the uploaded PDF to `POST /api/Chat`.
4. **Grounding check:** Send an unrelated question and verify that the model says the uploaded context does not contain the answer.
5. **Source check:** Verify that returned source labels contain the expected filename and page numbers.

### 20.9 Azure cost, security, and lifecycle notes

- Azure services and model deployments may incur charges. Review current pricing, quotas, regional availability, and free-tier limitations before creating resources.
- Use a development resource group and delete resources only when you are sure they are no longer needed.
- Never store keys in Git, frontend environment files, Angular code, or this Markdown file.
- Never send Azure OpenAI or Azure AI Search admin keys to the browser. All calls requiring those credentials must remain server-side.
- Apply least privilege and authentication/authorization before exposing the API beyond local development.
- Consider Azure Key Vault and managed identity for production.
- Restrict network access where possible and monitor usage, errors, and costs.
- The Azure AI Search Free tier has capacity/feature limits. Confirm that the tier supports the index/vector configuration you need before scaling up.
- Region availability and portal UI can change. Follow the current Azure portal and model availability information if a deployment option differs from this runbook.
