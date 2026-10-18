using IntelliDocs_AI.Server.Models;
using IntelliDocs_AI.Server.Services;
using IntelliDocs_AI.Server.Services.AIServices;
using Microsoft.AspNetCore.Mvc;

namespace IntelliDocs_AI.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Produces("application/json")]
    public class DocumentsController : ControllerBase
    {
        private readonly IDocumentStorageService _storage;
        private readonly ILogger<DocumentsController> _logger;
        private readonly PdfProcessingService _pdfProcessor;
        private readonly EmbeddingService _embeddingService;
        private readonly AzureSearchService _searchService;

        public DocumentsController(IDocumentStorageService storage, ILogger<DocumentsController> logger, AzureSearchService searchService, EmbeddingService embeddingService, PdfProcessingService pdfProcessor)
        {
            _storage = storage;
            _logger = logger;
            _searchService = searchService;
            _embeddingService = embeddingService;
            _pdfProcessor = pdfProcessor;
        }

        // ─── GET api/documents ───────────────────────────────────────────────────
        /// <summary>Returns metadata for all uploaded documents.</summary>
        [HttpGet]
        [ProducesResponseType(typeof(IEnumerable<DocumentDto>), StatusCodes.Status200OK)]
        public ActionResult<IEnumerable<DocumentDto>> GetAll()
        {
            var docs = _storage.GetAll().Select(d => ToDto(d));
            return Ok(docs);
        }

        // ─── GET api/documents/{id} ───────────────────────────────────────────────
        /// <summary>Returns metadata for a single document.</summary>
        [HttpGet("{id:guid}")]
        [ProducesResponseType(typeof(DocumentDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
        {
            var result = await _storage.GetAsync(id, ct);
            if (result is null)
                return NotFound(new { message = $"Document {id} not found." });

            var (_, doc) = result.Value;
            return Ok(ToDto(doc));
        }

        // ─── GET api/documents/{id}/download ────────────────────────────────────
        /// <summary>Downloads the raw file for a document.</summary>
        [HttpGet("{id:guid}/download")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> Download(Guid id, CancellationToken ct)
        {
            var result = await _storage.GetAsync(id, ct);
            if (result is null)
                return NotFound(new { message = $"Document {id} not found." });

            var (stream, doc) = result.Value;
            return File(stream, doc.ContentType, doc.OriginalFileName);
        }

        // ─── POST api/documents/upload ───────────────────────────────────────────
        /// <summary>Uploads a document (PDF, Word, Excel, PowerPoint, TXT). Max 50 MB.</summary>
        [HttpPost("upload")]
        [RequestSizeLimit(52_428_800)] // 50 MB
        [ProducesResponseType(typeof(UploadDocumentResponse), StatusCodes.Status201Created)]
        [ProducesResponseType(typeof(UploadDocumentResponse), StatusCodes.Status400BadRequest)]
        public async Task<ActionResult<UploadDocumentResponse>> Upload(
            IFormFile file,
            CancellationToken ct)
        {
            if (file is null || file.Length == 0)
                return BadRequest(new UploadDocumentResponse
                {
                    Success = false,
                    Message = "No file was provided or the file is empty.",
                });

            try
            {
                var doc = await _storage.SaveAsync(file, ct);

                // Process PDF and index its chunks for RAG.
                if (string.Equals(
                    Path.GetExtension(doc.OriginalFileName),
                    ".pdf",
                    StringComparison.OrdinalIgnoreCase))
                {
                    var chunks = _pdfProcessor.ProcessPdf(
                        doc.StoragePath,
                        doc.Id,
                        doc.OriginalFileName,
                        ct);

                    foreach (var chunk in chunks)
                    {
                        chunk.ContentVector = await _embeddingService.GenerateEmbeddingAsync(chunk.ChunkText, ct);
                    }

                    await _searchService.UploadChunksAsync(chunks, ct);

                    _logger.LogInformation(
                        "Indexed document {DocumentId} with {ChunkCount} chunks.",
                        doc.Id,
                        chunks.Count);
                }

                var dto = ToDto(doc);

                return CreatedAtAction(
                    nameof(GetById),
                    new { id = doc.Id },
                    new UploadDocumentResponse
                    {
                        Success = true,
                        Message = "Document uploaded successfully.",
                        Document = dto,
                    });
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogWarning(ex, "Upload rejected: {Message}", ex.Message);
                return BadRequest(new UploadDocumentResponse
                {
                    Success = false,
                    Message = ex.Message,
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error during upload.");
                return StatusCode(StatusCodes.Status500InternalServerError, new UploadDocumentResponse
                {
                    Success = false,
                    Message = "An unexpected error occurred. Please try again.",
                });
            }
        }

        // ─── DELETE api/documents/{id} ────────────────────────────────────────────
        /// <summary>Deletes a document by id.</summary>
        [HttpDelete("{id:guid}")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public IActionResult Delete(Guid id)
        {
            var deleted = _storage.Delete(id);
            if (!deleted)
                return NotFound(new { message = $"Document {id} not found." });

            return NoContent();
        }

        // ─── helpers ─────────────────────────────────────────────────────────────
        private DocumentDto ToDto(Document doc) => new()
        {
            Id = doc.Id,
            FileName = doc.OriginalFileName,
            ContentType = doc.ContentType,
            SizeBytes = doc.SizeBytes,
            UploadedAt = doc.UploadedAt,
            DownloadUrl = Url.Action(nameof(Download), "Documents", new { id = doc.Id }, Request.Scheme) ?? string.Empty,
        };
    }
}
