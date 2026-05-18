namespace Yaly.Api.Models;

public class CreateRequestDto
{
    public string TemplateName { get; set; } = "";
    public string Name { get; set; } = "";
    public string Team { get; set; } = "";
    public string Owner { get; set; } = "";
    public Dictionary<string, object> Values { get; set; } = new();
}

public class ApproveRequestDto
{
    public string? Reason { get; set; }
}

public class RejectRequestDto
{
    public string Reason { get; set; } = "";
}
