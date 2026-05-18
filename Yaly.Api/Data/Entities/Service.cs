namespace Yaly.Api.Data.Entities;

/// <summary>
/// A catalog entry created automatically when a <see cref="ProvisioningRequest"/> completes.
/// Nothing is hand-registered — the catalog is a byproduct of provisioning.
/// </summary>
public class Service
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid OrgId { get; set; }
    public string Name { get; set; } = "";
    public string TemplateName { get; set; } = "";
    public string ServiceType { get; set; } = "Service";
    public string Team { get; set; } = "";
    public string Owner { get; set; } = "";

    /// <summary>Lifecycle stage, derived from the environment input when present.</summary>
    public string Lifecycle { get; set; } = "production";

    public string? Description { get; set; }
    public string? RepoUrl { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>The request that produced this service.</summary>
    public Guid RequestId { get; set; }
}
