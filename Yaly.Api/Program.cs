using Microsoft.EntityFrameworkCore;
using Yaly.Api.Data;
using Yaly.Api.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
    });

builder.Services.AddDbContext<YalyDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));
builder.Services.AddSingleton<CatalogService>();
builder.Services.AddSingleton<TemplateRenderer>();
builder.Services.AddSingleton<GitLocalService>();
builder.Services.AddSingleton<GitHubService>();

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<YalyDbContext>();
    db.Database.EnsureCreated();
}

app.UseCors();
app.MapControllers();

app.Run();
