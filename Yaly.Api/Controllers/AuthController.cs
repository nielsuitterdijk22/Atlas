using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Yaly.Api.Data;
using Yaly.Api.Services;

namespace Yaly.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly YalyDbContext _db;
    private readonly string _frontendUrl;

    public AuthController(YalyDbContext db, IConfiguration config)
    {
        _db = db;
        _frontendUrl = config["Frontend:Url"] ?? "http://localhost:5173";
    }

    /// <summary>Kicks off the GitHub OAuth flow; lands back on the SPA when done.</summary>
    [Microsoft.AspNetCore.Authorization.AllowAnonymous]
    [HttpGet("login")]
    public IActionResult Login([FromQuery] string? returnUrl)
    {
        var target = string.IsNullOrWhiteSpace(returnUrl) ? _frontendUrl : returnUrl;
        return Challenge(new AuthenticationProperties { RedirectUri = target }, "GitHub");
    }

    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        return NoContent();
    }

    /// <summary>The signed-in user and the organizations they belong to.</summary>
    [HttpGet("me")]
    public async Task<ActionResult> Me()
    {
        var claim = User.FindFirst(YalyClaims.UserId)?.Value;
        if (claim == null || !Guid.TryParse(claim, out var userId))
            return Unauthorized();

        var user = await _db.Users.FindAsync(userId);
        if (user == null) return Unauthorized();

        var memberships = await (
            from m in _db.Memberships
            join o in _db.Organizations on m.OrgId equals o.Id
            where m.UserId == userId && m.Status == "active"
            orderby o.Name
            select new { orgId = o.Id, orgName = o.Name, orgSlug = o.Slug, role = m.Role }
        ).ToListAsync();

        return Ok(new
        {
            user = new
            {
                id = user.Id,
                gitHubLogin = user.GitHubLogin,
                displayName = user.DisplayName,
                email = user.Email,
                avatarUrl = user.AvatarUrl,
            },
            memberships,
        });
    }
}
