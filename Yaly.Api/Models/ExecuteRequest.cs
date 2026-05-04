namespace Yaly.Api.Models;

public class ExecuteRequest
{
    public Dictionary<string, object> Values { get; set; } = new();
    public string? Preset { get; set; }
}
