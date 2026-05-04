namespace Yaly.Api.Models;

public class ExecuteResult
{
    public bool Success { get; set; }
    public string Message { get; set; } = "";
    public string? CommitSha { get; set; }
    public string? CommitUrl { get; set; }
    public List<string> FilesCreated { get; set; } = new();
}
