namespace Yaly.Api.Models;

public class TemplateDefinition
{
    public string ApiVersion { get; set; } = "yaly/v1";
    public string Kind { get; set; } = "Template";
    public TemplateMetadata Metadata { get; set; } = new();
    public TemplateSpec Spec { get; set; } = new();
}

public class TemplateMetadata
{
    public string Name { get; set; } = "";
    public string Title { get; set; } = "";
    public string Description { get; set; } = "";
    public string Icon { get; set; } = "file";

    /// <summary>Label shown for services created from this template (e.g. "Microservice").</summary>
    public string ServiceType { get; set; } = "Service";
}

public class TemplateSpec
{
    public string Owner { get; set; } = "";
    public List<TemplateInput> Inputs { get; set; } = new();
    public OutputSpec Output { get; set; } = new();

    /// <summary>When true, requests from this template queue for platform-team approval.</summary>
    public bool ApprovalRequired { get; set; }

    /// <summary>Id of the input used as the service name. When unset, falls back to
    /// an input id of "name", then "service_name", then the first required string input.</summary>
    public string? NameInput { get; set; }
}

public class OutputSpec
{
    public string? Preset { get; set; }
    public TargetSpec Target { get; set; } = new();
    public GitHubSpec? GitHub { get; set; }
    public string Template { get; set; } = "./skeleton/";
}

public class TargetSpec
{
    public string Type { get; set; } = "local";
    public string Repo { get; set; } = "";
    public string Branch { get; set; } = "main";
    public string Path { get; set; } = "/";
    public string CommitMessage { get; set; } = "chore: apply template";
}

public class GitHubSpec
{
    public string TokenEnv { get; set; } = "GITHUB_TOKEN";
}
