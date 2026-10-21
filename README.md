# IntelliDocs-AI

> **AI-powered document assistant** — upload PDFs, Word, or Excel files and have a natural-language conversation with them, backed by Azure OpenAI and Azure AI Search.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Tech Stack](#tech-stack)
4. [Project Structure](#project-structure)
5. [Data & Request Flow](#data--request-flow)
6. [RAG Pipeline (Deep Dive)](#rag-pipeline-deep-dive)
7. [API Reference](#api-reference)
8. [Configuration](#configuration)
9. [Getting Started](#getting-started)
10. [Component Breakdown](#component-breakdown)

---

## Overview

IntelliDocs-AI is a full-stack intelligent document platform. Users upload documents through a clean, split-panel web interface — the left panel displays the document viewer and the right panel hosts the chat assistant. Once a document is uploaded, the backend automatically chunks and indexes it in Azure AI Search using vector embeddings. Subsequent chat questions trigger a **Retrieval-Augmented Generation (RAG)** pipeline: the question is embedded, the most relevant document chunks are retrieved by vector similarity, and the assembled context is sent to Azure OpenAI GPT to produce a grounded, citation-backed answer.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Browser (Client)                            │
│                                                                     │
│   ┌──────────────────────────┐   ┌──────────────────────────────┐  │
│   │      PDF Viewer Panel    │   │       Chat Panel             │  │
│   │  ─────────────────────   │   │  ──────────────────────────  │  │
│   │  • Upload / Browse files │   │  • Message history           │  │
│   │  • Document list         │   │  • Typing indicator          │  │
│   │  • Zoom / Page controls  │   │  • Source citations          │  │
│   │  • Drag-and-drop zone    │   │  • Regenerate support        │  │
│   └──────────────┬───────────┘   └───────────────┬──────────────┘  │
│                  │  Angular 19 (Standalone)       │                 │
│                  │  DocumentService               ChatService       │
└──────────────────┼────────────────────────────────┼────────────────┘
                   │              HTTPS / REST       │
                   ▼                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   ASP.NET Core 10 Web API                           │
│                                                                     │
│   POST /api/documents/upload         POST /api/chat                 │
│   GET  /api/documents                GET  /api/health               │
│   GET  /api/documents/{id}/download                                 │
│   DELETE /api/documents/{id}                                        │
│                                                                     │
│   ┌──────────────────────────┐   ┌──────────────────────────────┐  │
│   │  DocumentsController     │   │     ChatController           │  │
│   └──────────┬───────────────┘   └──────────────┬───────────────┘  │
│              │                                  │                   │
│   ┌──────────▼───────────────────────────────────▼──────────────┐  │
│   │                     Service Layer                            │  │
│   │                                                              │  │
│   │  LocalDocumentStorageService   PdfProcessingService         │  │
│   │  EmbeddingService              AzureSearchService           │  │
│   │  ChatService                                                 │  │
│   └──────────────────────────────────────────────────────────────┘  │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
           ┌───────────────┴───────────────┐
           │                               │
           ▼                               ▼
┌─────────────────────┐       ┌──────────────────────────┐
│   Azure OpenAI      │       │    Azure AI Search       │
│                     │       │                          │
│  • text-embedding   │       │  • Vector index          │
│    -ada-002         │       │  • KNN similarity search │
│  • GPT-4o / GPT-4   │       │  • Document chunk store  │
└─────────────────────┘       └──────────────────────────┘
```

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | Angular 19 (Standalone Components) | SPA shell, routing, UI |
| **UI State** | Angular Signals (`signal()`) | Reactive, fine-grained state |
| **HTTP Client** | Angular `HttpClient` | REST calls with upload progress |
| **Styling** | CSS Custom Properties + Flexbox | Design tokens, responsive layout |
| **Backend** | ASP.NET Core 10 Web API | REST API, DI container, middleware |
| **PDF Parsing** | PdfPig 0.1.16 | Page-level text extraction |
| **Embeddings** | Azure OpenAI (text-embedding-ada-002) | Convert text to dense float vectors |
| **Vector Store** | Azure AI Search 12.x | KNN vector index + full-text index |
| **Chat LLM** | Azure OpenAI (GPT-4o / GPT-4) | Grounded answer generation |
| **API Docs** | Swashbuckle / Swagger UI | Auto-generated OpenAPI spec |

---

## Project Structure

```
IntelliDocs-AI/
│
├── IntelliDocs-AI.Server/              # ASP.NET Core 10 Web API
│   ├── Controllers/
│   │   ├── ChatController.cs           # POST /api/chat  — RAG Q&A endpoint
│   │   ├── DocumentsController.cs      # CRUD + upload endpoint
│   │   └── HealthController.cs         # GET /api/health
│   │
│   ├── Models/
│   │   ├── Document.cs                 # Domain model + DTOs + upload response
│   │   └── DocumentChunk.cs            # Chunk model (id, page, text, vector)
│   │
│   ├── Services/
│   │   ├── IDocumentStorageService.cs  # Storage abstraction interface
│   │   ├── LocalDocumentStorageService.cs  # In-memory metadata + disk files
│   │   │
│   │   └── AI-Services/
│   │       ├── PdfProcessingService.cs # PdfPig extraction + sliding-window chunking
│   │       ├── EmbeddingService.cs     # Azure OpenAI embedding calls
│   │       ├── AzureSearchService.cs   # Upload / KNN search / delete in Azure AI Search
│   │       ├── ChatService.cs          # GPT chat completion with injected context
│   │       └── RagChatService.cs       # (Reserved — future orchestration layer)
│   │
│   ├── Program.cs                      # DI registration, CORS, Swagger, middleware
│   ├── appsettings.json                # Base configuration keys (no secrets)
│   └── appsettings.Development.json    # Dev-only overrides
│
└── IntelliDocs-AI.Web/                 # Angular 19 SPA
    └── src/
        └── app/
            ├── app.ts                  # Root component (shell)
            ├── app.html                # Two-panel layout template
            ├── app.css                 # Shell layout (flexbox)
            ├── app.config.ts           # provideHttpClient, provideRouter
            ├── app.routes.ts           # Route definitions
            │
            ├── components/
            │   ├── sidebar/            # Navigation, search history, new document
            │   ├── top-header/         # Document title, user avatar, actions
            │   ├── pdf-viewer/         # Upload zone, document view, zoom/page controls
            │   └── chat-panel/         # Message list, input bar, regenerate
            │
            └── core/
                ├── models/
                │   ├── document.model.ts   # DocumentDto, UploadDocumentResponse
                │   └── chat.model.ts       # ChatRequest, ChatResponse
                └── services/
                    ├── document.service.ts # Upload (with progress), getAll, delete
                    └── chat.service.ts     # ask(question) → ChatResponse
```

---

## Data & Request Flow

### 1 — Document Upload Flow

```
User picks file (Browse / Drag-drop)
        │
        ▼
PdfViewerComponent.upload(file)
        │  FormData multipart POST
        ▼
DocumentService.upload(file)            ← Angular HttpClient (reportProgress: true)
        │  streams UploadProgress events (0–100%)
        │  then emits final Response event
        ▼
POST /api/documents/upload              ← ASP.NET Core
        │
        ├─► LocalDocumentStorageService.SaveAsync()
        │         • writes file to disk (wwwroot/uploads or temp)
        │         • stores Document metadata in in-memory dictionary
        │
        ├─► PdfProcessingService.ProcessPdf()
        │         • opens PDF with PdfPig
        │         • iterates pages → extracts raw text
        │         • sliding-window chunker (size 2500 / overlap 250 chars)
        │         • returns List<DocumentChunk>
        │
        ├─► EmbeddingService.GenerateEmbeddingAsync()   (per chunk)
        │         • calls Azure OpenAI Embeddings API
        │         • returns float[] (1536 dimensions for ada-002)
        │         • stored in chunk.ContentVector
        │
        └─► AzureSearchService.UploadChunksAsync()
                  • maps chunks → SearchDocument objects
                  • batches up to 1000 per IndexDocumentsBatch.Upload call
                  • pushes to Azure AI Search vector index
                  • returns 201 Created + DocumentDto to client
```

### 2 — Chat Q&A Flow (RAG Pipeline)

```
User types question → presses Send
        │
        ▼
ChatPanelComponent.sendMessage()
        │  POST { question }
        ▼
ChatService.ask(question)               ← Angular HttpClient
        │
        ▼
POST /api/chat                          ← ASP.NET Core ChatController
        │
        ├─ Step 1: EmbeddingService.GenerateEmbeddingAsync(question)
        │           → float[] queryVector  (same model as indexing)
        │
        ├─ Step 2: AzureSearchService.SearchSimilarChunksAsync(queryVector, top: 5)
        │           • VectorizedQuery over contentVector field
        │           • KNN returns top-5 most similar DocumentChunks
        │           • includes: id, documentId, fileName, pageNumber, chunkText
        │
        └─ Step 3: ChatService.GetAnswerAsync(question, chunks)
                    • builds system prompt:
                      "Answer using only the provided document context…"
                    • builds user message:
                      "Document context:\n{File/Page/Text per chunk}\n\nQuestion: …"
                    • calls Azure OpenAI Chat Completions (GPT-4o)
                    • returns answer string
        │
        ▼
ChatResponse { answer, sources: ["fileName (Page N)", …] }
        │
        ▼
ChatPanelComponent renders:
    • AI bubble with answer text
    • Source chips (file + page citations)
    • Message timestamp
```

### 3 — Document Delete Flow

```
DELETE /api/documents/{id}
        │
        ├─► AzureSearchService.DeleteChunksByDocumentIdAsync(id)
        │         • searches index filtered by documentId field
        │         • collects all chunk ids
        │         • batch-deletes in groups of 500
        │
        └─► LocalDocumentStorageService.Delete(id)
                  • removes file from disk
                  • removes metadata from in-memory store
                  • returns 204 No Content
```

---

## RAG Pipeline (Deep Dive)

Retrieval-Augmented Generation (RAG) is the core AI pattern used by IntelliDocs-AI. It prevents LLM hallucination by grounding every answer in the actual uploaded document text.

```
┌──────────────────────────────────────────────────────────────────┐
│                     INDEXING  (on upload)                        │
│                                                                  │
│  Raw PDF                                                         │
│     │                                                            │
│     ▼  PdfPig                                                    │
│  Page Text ──► Sliding-Window Chunker ──► Chunks (2500 / 250)   │
│                                              │                   │
│                                              ▼  Azure OpenAI     │
│                                         Embeddings API           │
│                                              │  float[1536]      │
│                                              ▼                   │
│                                    Azure AI Search Index         │
│                                    (id, docId, page, text,       │
│                                     contentVector)               │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                     RETRIEVAL  (on chat)                         │
│                                                                  │
│  User Question                                                   │
│     │                                                            │
│     ▼  Azure OpenAI Embeddings                                   │
│  Query Vector (float[1536])                                      │
│     │                                                            │
│     ▼  Azure AI Search KNN                                       │
│  Top-5 Closest Chunks  ◄── cosine / HNSW similarity             │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                     GENERATION  (on chat)                        │
│                                                                  │
│  System Prompt                                                   │
│  "Answer only from document context. Do not invent facts."       │
│     │                                                            │
│  User Message                                                    │
│  "Document context:\n{chunk texts}\n\nQuestion: {user question}" │
│     │                                                            │
│     ▼  Azure OpenAI Chat Completions (GPT-4o)                    │
│  Grounded Answer + Source Citations                              │
└──────────────────────────────────────────────────────────────────┘
```

**Chunking strategy:** Sliding-window with `ChunkSize = 2500` characters and `ChunkOverlap = 250` characters. The overlap ensures that sentences spanning a chunk boundary are fully represented in at least one chunk, preventing context loss at splits.

---

## API Reference

### Documents

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `GET` | `/api/documents` | List all document metadata | — |
| `GET` | `/api/documents/{id}` | Get single document metadata | — |
| `GET` | `/api/documents/{id}/download` | Download raw file | — |
| `POST` | `/api/documents/upload` | Upload file (max 50 MB), triggers RAG indexing | — |
| `DELETE` | `/api/documents/{id}` | Delete document + indexed chunks | — |

**Upload request:** `multipart/form-data`, field name `file`.

**Upload response (201):**
```json
{
  "success": true,
  "message": "Document uploaded successfully.",
  "document": {
    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "fileName": "ProductRequirements.pdf",
    "contentType": "application/pdf",
    "sizeBytes": 204800,
    "uploadedAt": "2026-10-20T09:30:00Z",
    "downloadUrl": "https://localhost:7002/api/documents/{id}/download"
  }
}
```

### Chat

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/chat` | Ask a question; returns grounded answer + page citations |

**Request:**
```json
{ "question": "What are the main battery safety instructions?" }
```

**Response (200):**
```json
{
  "answer": "According to the document, you should only use the official charger and USB cable…",
  "sources": ["ProductRequirements.pdf (Page 4)", "ProductRequirements.pdf (Page 5)"]
}
```

### Health

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Returns server status |

---

## Configuration

The server reads the following keys from `appsettings.json`, environment variables, or **User Secrets** (recommended for local development).

```json
{
  "AzureOpenAI": {
    "Endpoint": "https://<your-resource>.openai.azure.com/",
    "ApiKey": "<your-azure-openai-key>",
    "EmbeddingDeployment": "text-embedding-ada-002",
    "ChatDeployment": "gpt-4o"
  },
  "AzureSearch": {
    "Endpoint": "https://<your-search>.search.windows.net",
    "ApiKey": "<your-search-admin-key>",
    "IndexName": "intellidocs-chunks"
  }
}
```

> **Never commit API keys.** Use `dotnet user-secrets set` locally or environment variables / Azure Key Vault in production.

---

## Getting Started

### Prerequisites

- [.NET 10 SDK](https://dotnet.microsoft.com/download)
- [Node.js 20+](https://nodejs.org/)
- [Angular CLI 19](https://angular.io/cli) — `npm install -g @angular/cli`
- An **Azure subscription** with:
  - Azure OpenAI resource (deployments: `text-embedding-ada-002`, `gpt-4o`)
  - Azure AI Search resource (index configured with vector field `contentVector`, dimension 1536)

### 1 — Clone

```bash
git clone https://github.com/SUBHASHSUSHIL/IntelliDocs-AI.git
cd IntelliDocs-AI
```

### 2 — Configure the server

```bash
cd IntelliDocs-AI.Server

dotnet user-secrets set "AzureOpenAI:Endpoint"           "https://<resource>.openai.azure.com/"
dotnet user-secrets set "AzureOpenAI:ApiKey"             "<key>"
dotnet user-secrets set "AzureOpenAI:EmbeddingDeployment" "text-embedding-ada-002"
dotnet user-secrets set "AzureOpenAI:ChatDeployment"     "gpt-4o"
dotnet user-secrets set "AzureSearch:Endpoint"           "https://<search>.search.windows.net"
dotnet user-secrets set "AzureSearch:ApiKey"             "<admin-key>"
dotnet user-secrets set "AzureSearch:IndexName"          "intellidocs-chunks"
```

### 3 — Run the server

```bash
dotnet run
# API available at: https://localhost:7002
# Swagger UI:       https://localhost:7002/swagger
```

### 4 — Run the frontend

```bash
cd ../IntelliDocs-AI.Web
npm install
ng serve
# App available at: http://localhost:4200
```

---

## Component Breakdown

### Frontend — Angular 19

| Component | Responsibility |
|---|---|
| `AppComponent` | Root shell — sidebar + main area (header + content) layout |
| `SidebarComponent` | New document button, document search, chat history list |
| `TopHeaderComponent` | Active document title, user avatar, notification actions |
| `PdfViewerComponent` | Upload drop zone, document list, viewer placeholder, zoom/page toolbar |
| `ChatPanelComponent` | Renders message history, typing indicator, source chips, input bar, regenerate |

| Service | Responsibility |
|---|---|
| `DocumentService` | `upload()` with progress tracking, `getAll()`, `getById()`, `delete()` |
| `ChatService` | `ask(question)` → `ChatResponse` (answer + sources array) |

### Backend — ASP.NET Core 10

| Class | Responsibility |
|---|---|
| `DocumentsController` | REST CRUD for documents; orchestrates upload → chunk → embed → index pipeline |
| `ChatController` | Receives question; runs embed → search → generate pipeline; returns answer |
| `HealthController` | Simple liveness probe |
| `LocalDocumentStorageService` | File system writes; in-memory metadata store (implements `IDocumentStorageService`) |
| `PdfProcessingService` | PdfPig page extraction + sliding-window text chunker |
| `EmbeddingService` | Wraps Azure OpenAI `EmbeddingClient`; returns `float[]` vectors |
| `AzureSearchService` | Wraps Azure AI Search `SearchClient`; upload batches, KNN vector search, chunk deletion |
| `ChatService` | Wraps Azure OpenAI `ChatClient`; assembles RAG prompt; returns completion text |

---

## License

This project is private. All rights reserved © 2026 Sushil Thakur.
