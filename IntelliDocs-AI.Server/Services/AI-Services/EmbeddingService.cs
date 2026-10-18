using Azure;
using Azure.AI.OpenAI;
using OpenAI.Embeddings;

namespace IntelliDocs_AI.Server.Services.AIServices
{
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
                text,
                cancellationToken: cancellationToken);

            return result.Value.ToFloats().ToArray();
        }
    }
}
