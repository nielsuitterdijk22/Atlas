using Microsoft.EntityFrameworkCore;
using Yaly.Api.Data;
using Yaly.Api.Data.Entities;

namespace Yaly.Api.Services;

/// <summary>
/// Per-request access context: who is calling, which organization is active
/// (from the <c>X-Yaly-Org</c> header), and their role within it.
/// </summary>
public class AccessContext
{
    public User? User { get; init; }
    public Organization? Org { get; init; }
    public Membership? Membership { get; init; }

    public bool IsAuthenticated => User != null;
    public bool HasOrg => Org != null && Membership != null;
    public Guid UserId => User!.Id;
    public Guid OrgId => Org!.Id;
    public string Role => Membership?.Role ?? "developer";
    public bool IsPlatformEngineer => Role == "platform-engineer";

    public static readonly AccessContext Anonymous = new();
    public static AccessContext UserOnly(User user) => new() { User = user };
}

public interface IUserContext
{
    Task<AccessContext> ResolveAsync();
}

public class UserContext : IUserContext
{
    private readonly IHttpContextAccessor _http;
    private readonly YalyDbContext _db;
    private AccessContext? _cached;

    public UserContext(IHttpContextAccessor http, YalyDbContext db)
    {
        _http = http;
        _db = db;
    }

    public async Task<AccessContext> ResolveAsync()
    {
        if (_cached != null) return _cached;

        var httpCtx = _http.HttpContext;
        var claim = httpCtx?.User.FindFirst(YalyClaims.UserId)?.Value;
        if (claim == null || !Guid.TryParse(claim, out var userId))
            return _cached = AccessContext.Anonymous;

        var user = await _db.Users.FindAsync(userId);
        if (user == null)
            return _cached = AccessContext.Anonymous;

        var orgHeader = httpCtx!.Request.Headers["X-Yaly-Org"].ToString();
        if (!Guid.TryParse(orgHeader, out var orgId))
            return _cached = AccessContext.UserOnly(user);

        var membership = await _db.Memberships
            .FirstOrDefaultAsync(m => m.OrgId == orgId && m.UserId == userId && m.Status == "active");
        if (membership == null)
            return _cached = AccessContext.UserOnly(user);

        var org = await _db.Organizations.FindAsync(orgId);
        if (org == null)
            return _cached = AccessContext.UserOnly(user);

        return _cached = new AccessContext { User = user, Org = org, Membership = membership };
    }
}
