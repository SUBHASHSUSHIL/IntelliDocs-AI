using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.Text;

namespace IntelliDocs_AI.Server.Controllers
{
    [Route("api/documents")]
    [ApiController]
    public class DocumentsController : ControllerBase
    {
        private readonly IWebHostEnvironment _env;
        public DocumentsController(IWebHostEnvironment env) => _env = env;

        [HttpPost("uploads")]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> Upload(IFormFile file, CancellationToken cancellationToken)
        {
            if (file == null || file.Length == 0)
                return BadRequest("Please upload a PDF file.");

            if (!string.Equals(Path.GetExtension(file.FileName), ".pdf", StringComparison.OrdinalIgnoreCase))
                return BadRequest("Only PDF files are allowed.");

            // Basic header check for %PDF
            using (var headerStream = file.OpenReadStream())
            {
                var header = new byte[4];
                var read = await headerStream.ReadAsync(header, 0, header.Length, cancellationToken);
                if (read < 4 || Encoding.ASCII.GetString(header) != "%PDF")
                    return BadRequest("File is not a valid PDF.");
            }

            // Sanitize filename and create target path
            var uploadsDir = Path.Combine(_env.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot"), "uploads");
            Directory.CreateDirectory(uploadsDir);

            var safeFileName = Path.GetFileName(file.FileName); // removes directory parts
            safeFileName = string.Concat(safeFileName.Split(Path.GetInvalidFileNameChars()));
            var uniqueName = $"{Path.GetFileNameWithoutExtension(safeFileName)}_{Guid.NewGuid():N}{Path.GetExtension(safeFileName)}";
            var filePath = Path.Combine(uploadsDir, uniqueName);

            // Save file
            await using (var fs = new FileStream(filePath, FileMode.CreateNew, FileAccess.Write, FileShare.None))
            {
                await file.CopyToAsync(fs, cancellationToken);
            }

            return Ok(new
            {
                message = "PDF received successfully",
                fileName = uniqueName,
                size = file.Length,
                url = $"/uploads/{uniqueName}"
            });
        }

        [HttpGet("uploads/{fileName}")]
        public IActionResult GetUploadedFile(string fileName)
        {
            var uploadsDir = Path.Combine(_env.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot"), "uploads");
            var filePath = Path.Combine(uploadsDir, fileName);
            if (!System.IO.File.Exists(filePath))
                return NotFound("File not found.");
            var contentType = "application/pdf"; // Assuming all files are PDFs
            return PhysicalFile(filePath, contentType, fileName);
        }
    }
}
