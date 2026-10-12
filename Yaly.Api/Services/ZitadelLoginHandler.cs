using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Authentication.OpenIdConnect;
using Microsoft.EntityFrameworkCore;
using Yaly.Api.Data;
using Yaly.Api.Data.Entities;

namespace Yaly.Api.Services;

/// <summary>
/// Runs during the Zitadel OIDC callback: upserts the <see cref="User"/> keyed
/// by the provider subject, activates any pending invites addressed to the
/// user's email, and stamps the session identity with the Yaly user id.
/// </summary>
public static class ZitadelLoginHandler
{
    public static async Task OnCreatingTicket(OpenIdConnectCreatingTicketContext ctx)
    {
        var identity = ctx.Principal?.Identity as ClaimsIdentity;
        if (identity == null)
        {
            ctx.HandleResponse();
            return;
        }

        var subject = identity.FindFirstValue(JwtRegisteredClaimNames.Sub);
        if (string.IsNullOrEmpty(subject))
        {
            ctx.HandleResponse();
            return;
        }

        var email = identity.FindFirstValue(ClaimTypes.Email) ?? "";
        var name = identity.FindFirstValue(ClaimTypes.Name) ?? "";
        var preferredName = identity.FindFirstValue("preferred_username") ?? "";
        var avatar = identity.FindFirstValue("picture") ?? null;

        var db = ctx.HttpContext.RequestServices.GetRequiredService<YalyDbContext>();

        var user = await db.Users.FirstOrDefaultAsync(u => u.Provider == "zitadel" && u.ProviderId == subject);
        if (user == null)
        {
            user = new User { Provider = "zitadel", ProviderId = subject };
            db.Users.Add(user);
        }

        user.GitHubLogin = preferredName;
        user.DisplayName = string.IsNullOrWhiteSpace(name) ? preferredName : name;
        user.Email = string.IsNullOrWhiteSpace(email) ? null : email;
        user.AvatarUrl = avatar;
        user.LastLoginAt = DateTime.UtcNow;

        // Link any invites addressed to this email.
        if (!string.IsNullOrWhiteSpace(email))
        {
            var pending = await db.Memberships
                .Where(m => m.GitHubLogin == email && m.UserId == null)
                .ToListAsync();
            foreach (var m in pending)
            {
                m.UserId = user.Id;
                m.Status = "active";
            }
        }

        await db.SaveChangesAsync();

        identity.AddClaim(new Claim(YalyClaims.UserId, user.Id.ToString()));
    }
}
