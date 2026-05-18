namespace Yaly.Api.Data.Entities;

/// <summary>An authenticated person. Identity comes from GitHub; Yaly owns authorization.</summary>
public class User
{
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>The numeric GitHub account id — the stable identity key.</summary>
    public long GitHubId { get; set; }
    public string GitHubLogin { get; set; } = "";
    public string DisplayName { get; set; } = "";
    public string? Email { get; set; }
    public string? AvatarUrl { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime LastLoginAt { get; set; } = DateTime.UtcNow;
}
