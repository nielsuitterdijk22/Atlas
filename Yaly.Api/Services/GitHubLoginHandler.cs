using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Authentication.OAuth;
using Microsoft.EntityFrameworkCore;
using Yaly.Api.Data;
using Yaly.Api.Data.Entities;

namespace Yaly.Api.Services;

/// <summary>The Yaly user id claim carried by the session cookie.</summary>
public static class YalyClaims
{
    public const string UserId = "yaly:uid";
}

/// <summary>
/// Runs during the GitHub OAuth callback: upserts the Yaly <see cref="User"/>,
/// activates any pending invites for that GitHub login, and stamps the session
/// identity with the Yaly user id.
/// </summary>
public static class GitHubLoginHandler
{
    public static async Task OnCreatingTicket(OAuthCreatingTicketContext ctx)
    {
        var json = ctx.User;
        var gitHubId = json.GetProperty("id").GetInt64();
        var login = json.TryGetProperty("login", out var l) ? l.GetString() ?? "" : "";
        var name = json.TryGetProperty("name", out var n) && n.ValueKind == JsonValueKind.String
            ? n.GetString() : null;
        var email = json.TryGetProperty("email", out var e) && e.ValueKind == JsonValueKind.String
            ? e.GetString() : ctx.Identity?.FindFirst(ClaimTypes.Email)?.Value;
        var avatar = json.TryGetProperty("avatar_url", out var a) ? a.GetString() : null;

        var db = ctx.HttpContext.RequestServices.GetRequiredService<YalyDbContext>();

        var user = await db.Users.FirstOrDefaultAsync(u => u.GitHubId == gitHubId);
        if (user == null)
        {
            user = new User { GitHubId = gitHubId };
            db.Users.Add(user);
        }

        user.GitHubLogin = login;
        user.DisplayName = string.IsNullOrWhiteSpace(name) ? login : name!;
        user.Email = email;
        user.AvatarUrl = avatar;
        user.LastLoginAt = DateTime.UtcNow;

        // Link any invites addressed to this GitHub login.
        var pending = await db.Memberships
            .Where(m => m.GitHubLogin == login && m.UserId == null)
            .ToListAsync();
        foreach (var m in pending)
        {
            m.UserId = user.Id;
            m.Status = "active";
        }

        await db.SaveChangesAsync();

        ctx.Identity?.AddClaim(new Claim(YalyClaims.UserId, user.Id.ToString()));
    }
}
