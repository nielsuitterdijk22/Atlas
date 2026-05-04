namespace Yaly.Api.Data.Entities;

public class ExecutionLog
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string TemplateName { get; set; } = "";
    public string TemplateTitle { get; set; } = "";
    public string Status { get; set; } = "pending";
    public string? CommitSha { get; set; }
    public string? CommitUrl { get; set; }
    public string? ErrorMessage { get; set; }
    public string? ValuesJson { get; set; }
    public List<string> FilesCreated { get; set; } = new();
    public string? OutputTarget { get; set; }
    public string? OutputRepo { get; set; }
    public DateTime ExecutedAt { get; set; } = DateTime.UtcNow;
    public double DurationMs { get; set; }
}
