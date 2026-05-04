namespace Yaly.Api.Models;

public class TemplateInput
{
    public string Id { get; set; } = "";
    public string Title { get; set; } = "";
    public string Type { get; set; } = "string";
    public bool Required { get; set; } = false;
    public string? Pattern { get; set; }
    public string? Description { get; set; }
    public object? Default { get; set; }
    public List<string>? Options { get; set; }
    public int? Min { get; set; }
    public int? Max { get; set; }
}
