namespace IntelliDocs_AI.Server.Models
{
    public class DocumentChunk
    {
        public string Id { get; set; } = string.Empty;

        public Guid DocumentId { get; set; }

        public string FileName { get; set; } = string.Empty;

        public int PageNumber { get; set; }

        public string ChunkText { get; set; } = string.Empty;

        public float[] ContentVector { get; set; } = [];
    }
}
