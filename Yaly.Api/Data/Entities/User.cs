namespace Yaly.Api.Data.Entities;

/// <summary>An authenticated person. Identity comes from the IdP (Zitadel, or GitHub in legacy/dev); Yaly owns authorization.</summary>
public class User
{
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>Identity provider: "zitadel" or "github". Legacy rows default to "github".</summary>
    public string Provider { get; set; } = "github";

    /// <summary>
    /// The provider's stable subject id (Zitadel "sub" claim, or the numeric
    /// GitHub account id for legacy users) — the stable identity key.
    /// </summary>
    public string ProviderId { get; set; } = "";

    /// <summary>Legacy: the numeric GitHub account id. Kept for existing rows; null for Zitadel users.</summary>
    public long? GitHubId { get; set; }
    public string GitHubLogin { get; set; } = "";
    public string DisplayName { get; set; } = "";
    public string? Email { get; set; }
    public string? AvatarUrl { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime LastLoginAt { get; set; } = DateTime.UtcNow;
}
