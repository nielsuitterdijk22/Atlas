namespace Yaly.Api.Data.Entities;

/// <summary>A tenant. All domain data is scoped to an organization.</summary>
public class Organization
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = "";
    public string Slug { get; set; } = "";

    /// <summary>GitHub repo (or local path for dev) holding this org's templates.</summary>
    public string? CatalogRepoUrl { get; set; }
    public string CatalogBranch { get; set; } = "main";
    public DateTime? LastCatalogSyncAt { get; set; }

    /// <summary>
    /// Access token for cloning a private catalog repo, encrypted with ASP.NET Data
    /// Protection. Never exposed to clients — decrypted only at clone time.
    /// </summary>
    public string? CatalogRepoTokenEncrypted { get; set; }

    public Guid CreatedByUserId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
