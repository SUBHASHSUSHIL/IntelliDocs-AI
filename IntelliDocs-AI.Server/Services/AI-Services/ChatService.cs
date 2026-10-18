using Azure;
using Azure.AI.OpenAI;
using OpenAI.Chat;

namespace IntelliDocs_AI.Server.Services.AIServices
{
    public class ChatService
    {
        private readonly ChatClient _client;

        public ChatService(IConfiguration configuration)
        {
            var endpoint = configuration["AzureOpenAI:Endpoint"]
                ?? throw new InvalidOperationException(
                    "Azure OpenAI endpoint is not configured.");

            var apiKey = configuration["AzureOpenAI:ApiKey"]
                ?? throw new InvalidOperationException(
                    "Azure OpenAI API key is not configured.");

            var deployment = configuration["AzureOpenAI:ChatDeployment"]
                ?? throw new InvalidOperationException(
                    "Chat deployment is not configured.");

            var azureClient = new AzureOpenAIClient(
                new Uri(endpoint),
                new AzureKeyCredential(apiKey));

            _client = azureClient.GetChatClient(deployment);
        }

        public async Task<string> GetAnswerAsync(
            string question,
            IReadOnlyList<Models.DocumentChunk> chunks,
            CancellationToken cancellationToken = default)
        {
            var context = string.Join(
                "\n\n",
                chunks.Select(c =>
                    $"File: {c.FileName}, Page: {c.PageNumber}\n{c.ChunkText}"));

            var messages = new List<ChatMessage>
        {
            new SystemChatMessage(
                "Answer using only the provided document context. " +
                "If the context does not contain the answer, say so. " +
                "Do not invent facts."),

            new UserChatMessage(
                $"Document context:\n{context}\n\nQuestion: {question}")
        };

            var result = await _client.CompleteChatAsync(
                messages,
                cancellationToken: cancellationToken);

            return string.Concat(
                result.Value.Content.Select(c => c.Text));
        }
    }
}
