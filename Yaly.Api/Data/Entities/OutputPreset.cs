namespace Yaly.Api.Data.Entities;

public class OutputPreset
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = "";
    public string? Description { get; set; }
    public string Type { get; set; } = "local";
    public string Repo { get; set; } = "";
    public string Branch { get; set; } = "main";
    public string Path { get; set; } = "/";
    public string? CommitMessageTemplate { get; set; }
    public string? GitHubTokenEnv { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
