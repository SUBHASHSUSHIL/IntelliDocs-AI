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


        // Add this method inside AzureSearchService class
        public async Task<IReadOnlyList<DocumentChunk>> SearchSimilarChunksAsync(
            float[] queryVector,
            int top = 5,
            CancellationToken cancellationToken = default)
        {
            var options = new SearchOptions
            {
                Size = top,
                Select = { "id", "documentId", "fileName", "pageNumber", "chunkText" }
            };

            options.VectorSearch = new VectorSearchOptions
            {
                Queries =
        {
            new VectorizedQuery(queryVector)
            {
                KNearestNeighborsCount = top,
                Fields = { "contentVector" }
            }
        }
            };

            var response = await _searchClient.SearchAsync<SearchDocument>(
                "*",
                options,
                cancellationToken);

            var chunks = new List<DocumentChunk>();

            await foreach (var result in response.Value.GetResultsAsync())
            {
                var item = result.Document;

                chunks.Add(new DocumentChunk
                {
                    Id = item["id"]?.ToString() ?? string.Empty,
                    DocumentId = Guid.Parse(item["documentId"]?.ToString() ?? Guid.Empty.ToString()),
                    FileName = item["fileName"]?.ToString() ?? string.Empty,
                    PageNumber = Convert.ToInt32(item["pageNumber"]),
                    ChunkText = item["chunkText"]?.ToString() ?? string.Empty
                });
            }

            return chunks;
        }


        public async Task DeleteChunksByDocumentIdAsync(
            Guid documentId,
            CancellationToken cancellationToken = default)
        {
            var documentIdValue = documentId.ToString();

            var options = new SearchOptions
            {
                Filter = $"documentId eq '{documentIdValue}'",
                Size = 1000,
                Select = { "id" }
            };

            var response = await _searchClient.SearchAsync<SearchDocument>(
                "*",
                options,
                cancellationToken);

            var chunkIds = new List<string>();

            await foreach (var result in response.Value.GetResultsAsync())
            {
                if (result.Document.TryGetValue("id", out var value) &&
                    value is not null)
                {
                    chunkIds.Add(value.ToString()!);
                }
            }

            // Delete in batches and check every result.
            const int batchSize = 500;

            for (var i = 0; i < chunkIds.Count; i += batchSize)
            {
                cancellationToken.ThrowIfCancellationRequested();

                var batch = IndexDocumentsBatch.Delete(
                    chunkIds.Skip(i).Take(batchSize)
                        .Select(id => new SearchDocument { ["id"] = id }));

                var deleteResponse = await _searchClient.IndexDocumentsAsync(
                    batch,
                    cancellationToken: cancellationToken);

                var failures = deleteResponse.Value.Results
                    .Where(item => !item.Succeeded)
                    .ToList();

                if (failures.Count > 0)
                {
                    throw new InvalidOperationException(
                        $"Failed to delete {failures.Count} indexed chunks " +
                        $"for document {documentId}.");
                }
            }
        }

    }
}
