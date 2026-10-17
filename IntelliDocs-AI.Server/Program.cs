using IntelliDocs_AI.Server.Services;

var builder = WebApplication.CreateBuilder(args);

// ── Services ──────────────────────────────────────────────────────────────────
builder.Services.AddControllers();

builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() { Title = "IntelliDocs-AI API", Version = "v1" });
});

// Document storage (local file system, in-memory metadata)
builder.Services.AddSingleton<IDocumentStorageService, LocalDocumentStorageService>();

// CORS – allow the Angular dev server
builder.Services.AddCors(options =>
{
    options.AddPolicy("AngularApp", policy =>
    {
        policy
            .WithOrigins("http://localhost:4200", "https://localhost:4200")
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

var app = builder.Build();

// ── Middleware ────────────────────────────────────────────────────────────────
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "IntelliDocs-AI API V1");
    });
}
else
{
    // Only redirect to HTTPS in production – in dev the 307 breaks CORS preflight
    app.UseHttpsRedirection();
}

app.UseCors("AngularApp");   // must be before routing / auth

app.UseStaticFiles();

app.UseAuthorization();

app.MapControllers();

app.Run();
