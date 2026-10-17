using IntelliDocs_AI.Server.Models;

namespace IntelliDocs_AI.Server.Services
{
    /// <summary>
    /// Stores uploaded documents on the local file system under wwwroot/uploads.
    /// All metadata is kept in memory; swap this for a database-backed implementation later.
    /// </summary>
    public class LocalDocumentStorageService : IDocumentStorageService
    {
        private static readonly HashSet<string> AllowedContentTypes = new(StringComparer.OrdinalIgnoreCase)
        {
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "application/vnd.ms-powerpoint",
            "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            "text/plain",
        };

        private const long MaxFileSizeBytes = 50 * 1024 * 1024; // 50 MB

        private readonly string _uploadDirectory;
        private readonly Dictionary<Guid, Document> _store = new();
        private readonly ILogger<LocalDocumentStorageService> _logger;

        public LocalDocumentStorageService(IWebHostEnvironment env, ILogger<LocalDocumentStorageService> logger)
        {
            _uploadDirectory = Path.Combine(env.WebRootPath, "uploads");
            Directory.CreateDirectory(_uploadDirectory);
            _logger = logger;
        }

        public async Task<Document> SaveAsync(IFormFile file, CancellationToken ct = default)
        {
            if (file is null || file.Length == 0)
                throw new ArgumentException("File is empty.");

            if (file.Length > MaxFileSizeBytes)
                throw new InvalidOperationException($"File exceeds the maximum allowed size of {MaxFileSizeBytes / (1024 * 1024)} MB.");

            if (!AllowedContentTypes.Contains(file.ContentType))
                throw new InvalidOperationException($"File type '{file.ContentType}' is not allowed.");

            var id = Guid.NewGuid();
            var ext = Path.GetExtension(file.FileName);
            var storedFileName = $"{id}{ext}";
            var fullPath = Path.Combine(_uploadDirectory, storedFileName);

            await using var stream = new FileStream(fullPath, FileMode.Create, FileAccess.Write, FileShare.None);
            await file.CopyToAsync(stream, ct);

            var doc = new Document
            {
                Id = id,
                FileName = storedFileName,
                OriginalFileName = file.FileName,
                ContentType = file.ContentType,
                SizeBytes = file.Length,
                UploadedAt = DateTime.UtcNow,
                StoragePath = fullPath,
            };

            _store[id] = doc;
            _logger.LogInformation("Saved document {Id} ({OriginalName})", id, file.FileName);
            return doc;
        }

        public async Task<(Stream stream, Document document)?> GetAsync(Guid id, CancellationToken ct = default)
        {
            if (!_store.TryGetValue(id, out var doc))
                return null;

            if (!File.Exists(doc.StoragePath))
            {
                _logger.LogWarning("Document file missing on disk: {Path}", doc.StoragePath);
                return null;
            }

            var stream = new FileStream(doc.StoragePath, FileMode.Open, FileAccess.Read, FileShare.Read);
            return await Task.FromResult<(Stream, Document)?> ((stream, doc));
        }

        public IReadOnlyList<Document> GetAll() =>
            _store.Values.OrderByDescending(d => d.UploadedAt).ToList();

        public bool Delete(Guid id)
        {
            if (!_store.TryGetValue(id, out var doc))
                return false;

            try { File.Delete(doc.StoragePath); } catch { /* best-effort */ }
            _store.Remove(id);
            return true;
        }
    }
}
