using Azure;
using Azure.Search.Documents;
using Azure.Search.Documents.Models;
using IntelliDocs_AI.Server.Models;

namespace IntelliDocs_AI.Server.Services.AIServices
{
    public class AzureSearchService
    {
        private readonly SearchClient _searchClient;

        public AzureSearchService(IConfiguration configuration)
        {
            var endpoint = configuration["AzureSearch:Endpoint"]
                ?? throw new InvalidOperationException(
                    "Azure AI Search endpoint is missing.");

            var apiKey = configuration["AzureSearch:ApiKey"]
                ?? throw new InvalidOperationException(
                    "Azure AI Search API key is missing.");

            var indexName = configuration["AzureSearch:IndexName"]
                ?? throw new InvalidOperationException(
                    "Azure AI Search index name is missing.");

            _searchClient = new SearchClient(
                new Uri(endpoint),
                indexName,
                new AzureKeyCredential(apiKey));
        }

        public async Task UploadChunksAsync(
            IEnumerable<DocumentChunk> chunks,
            CancellationToken cancellationToken = default)
        {
            var documents = chunks.Select(chunk =>
                new SearchDocument
                {
                    ["id"] = chunk.Id,
                    ["documentId"] = chunk.DocumentId.ToString(),
                    ["fileName"] = chunk.FileName,
                    ["pageNumber"] = chunk.PageNumber,
                    ["chunkText"] = chunk.ChunkText,
                    ["contentVector"] = chunk.ContentVector
                }).ToList();

            if (documents.Count == 0)
                return;

            const int batchSize = 1000;

            for (var i = 0; i < documents.Count; i += batchSize)
            {
                cancellationToken.ThrowIfCancellationRequested();

                var batch = IndexDocumentsBatch.Upload(
                    documents.Skip(i).Take(batchSize));

                var result = await _searchClient.IndexDocumentsAsync(
                    batch,
                    cancellationToken: cancellationToken);

                var failures = result.Value.Results
                    .Where(item => !item.Succeeded)
                    .ToList();

                if (failures.Count > 0)
                {
                    throw new InvalidOperationException(
                        $"Failed to index {failures.Count} document chunks.");
                }
            }
        }
    }
}
