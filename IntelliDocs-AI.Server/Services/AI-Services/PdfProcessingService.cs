using IntelliDocs_AI.Server.Models;
using UglyToad.PdfPig;

namespace IntelliDocs_AI.Server.Services.AIServices
{
    public class PdfProcessingService
    {
        private const int ChunkSize = 2500;
        private const int ChunkOverlap = 250;

        public IReadOnlyList<DocumentChunk> ProcessPdf(
            string filePath,
            Guid documentId,
            string fileName,
            CancellationToken cancellationToken = default)
        {
            var chunks = new List<DocumentChunk>();

            using var pdf = PdfDocument.Open(filePath);

            foreach (var page in pdf.GetPages())
            {
                cancellationToken.ThrowIfCancellationRequested();

                var text = page.Text;

                if (string.IsNullOrWhiteSpace(text))
                    continue;

                var pageChunks = SplitText(text);

                foreach (var chunkText in pageChunks)
                {
                    chunks.Add(new DocumentChunk
                    {
                        Id = Guid.NewGuid().ToString(),
                        DocumentId = documentId,
                        FileName = fileName,
                        PageNumber = page.Number,
                        ChunkText = chunkText
                    });
                }
            }

            return chunks;
        }

        private static IEnumerable<string> SplitText(string text)
        {
            var start = 0;

            while (start < text.Length)
            {
                var length = Math.Min(ChunkSize, text.Length - start);
                var chunk = text.Substring(start, length).Trim();

                if (!string.IsNullOrWhiteSpace(chunk))
                    yield return chunk;

                if (start + length >= text.Length)
                    yield break;

                start += ChunkSize - ChunkOverlap;
            }
        }
    }
}
