namespace IntelliDocs_AI.Server.Models
{
    public class Document
    {
        public Guid Id { get; set; }
        public string FileName { get; set; } = string.Empty;
        public string OriginalFileName { get; set; } = string.Empty;
        public string ContentType { get; set; } = string.Empty;
        public long SizeBytes { get; set; }
        public DateTime UploadedAt { get; set; }
        public string StoragePath { get; set; } = string.Empty;
    }

    public class DocumentDto
    {
        public Guid Id { get; set; }
        public string FileName { get; set; } = string.Empty;
        public string ContentType { get; set; } = string.Empty;
        public long SizeBytes { get; set; }
        public DateTime UploadedAt { get; set; }
        public string DownloadUrl { get; set; } = string.Empty;
    }

    public class UploadDocumentResponse
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
        public DocumentDto? Document { get; set; }
    }
}
