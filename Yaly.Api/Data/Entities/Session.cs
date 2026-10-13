namespace Yaly.Api.Data.Entities;

/// <summary>
/// Server-side session record: one row per user, tracking the last activity
/// time so inactivity-based expiration can be enforced, and a flag for
/// explicit logout (invalidation) so the session cannot be reused.
/// </summary>
public class Session
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>Last time the user did anything; the inactivity clock resets on every request.</summary>
    public DateTime LastActivityAt { get; set; } = DateTime.UtcNow;

    /// <summary>Set when the user logs out (or an admin kills the session); null while active.</summary>
    public DateTime? InvalidatedAt { get; set; }
}
