namespace Yaly.Api.Data.Entities;

/// <summary>
/// Links a user to an organization with a role. Created up-front for invites
/// (UserId null, Status "pending") and linked when the invitee first logs in.
/// </summary>
public class Membership
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid OrgId { get; set; }

    /// <summary>Null until the invited GitHub user logs in for the first time.</summary>
    public Guid? UserId { get; set; }

    /// <summary>The invitee's GitHub login — how a pending invite is matched on login.</summary>
    public string GitHubLogin { get; set; } = "";

    /// <summary>developer | platform-engineer</summary>
    public string Role { get; set; } = "developer";

    /// <summary>active | pending</summary>
    public string Status { get; set; } = "active";

    public Guid? InvitedByUserId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
