using IntelliDocs_AI.Server.Services.AIServices;
using Microsoft.AspNetCore.Mvc;

namespace IntelliDocs_AI.Server.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ChatController : ControllerBase
    {
        private readonly ILogger<ChatController> _logger;
        private readonly ChatService _chatService;
        private readonly EmbeddingService _embeddingService;
        private readonly AzureSearchService _searchService;

        public ChatController(
            ILogger<ChatController> logger,
            ChatService chatService,
            EmbeddingService embeddingService,
            AzureSearchService searchService)
        {
            _logger = logger;
            _chatService = chatService;
            _embeddingService = embeddingService;
            _searchService = searchService;
        }

        public class ChatRequest
        {
            public string Question { get; set; } = string.Empty;
        }

        public class ChatResponse
        {
            public string Answer { get; set; } = string.Empty;
            public List<string> Sources { get; set; } = [];
        }

        [HttpPost]
        public async Task<IActionResult> Ask(
            [FromBody] ChatRequest request,
            CancellationToken ct)
        {
            if (string.IsNullOrWhiteSpace(request.Question))
            {
                return BadRequest(new
                {
                    message = "Question is required."
                });
            }

            try
            {
                _logger.LogInformation("Step 1: Generating question embedding.");
                var queryVector =
                    await _embeddingService.GenerateEmbeddingAsync(request.Question, ct);
                _logger.LogInformation("Embedding generated. Dimensions: {Count}", queryVector.Length);

                _logger.LogInformation("Step 2: Searching Azure AI Search.");
                var chunks = await _searchService.SearchSimilarChunksAsync(
                    queryVector, top: 5, cancellationToken: ct);
                _logger.LogInformation("Search returned {Count} chunks.", chunks.Count);

                _logger.LogInformation("Step 3: Generating chat answer.");
                var answer = await _chatService.GetAnswerAsync(
                    request.Question, chunks, ct);
                _logger.LogInformation("Chat answer generated.");

                return Ok(new ChatResponse
                {
                    Answer = answer,
                    Sources = chunks
                        .Select(c => $"{c.FileName} (Page {c.PageNumber})")
                        .Distinct()
                        .ToList()
                });
            }
            catch (OperationCanceledException) when (ct.IsCancellationRequested)
            {
                return StatusCode(499, new
                {
                    message = "The request was cancelled."
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing chat question.");

                return StatusCode(500, new
                {
                    message = "An error occurred while answering your question."
                });
            }
        }
    }
}
