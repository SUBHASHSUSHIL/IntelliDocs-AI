using IntelliDocs_AI.Server.Models;

namespace IntelliDocs_AI.Server.Services
{
    public interface IDocumentStorageService
    {
        Task<Document> SaveAsync(IFormFile file, CancellationToken ct = default);
        Task<(Stream stream, Document document)?> GetAsync(Guid id, CancellationToken ct = default);
        IReadOnlyList<Document> GetAll();
        bool Delete(Guid id);
    }
}
