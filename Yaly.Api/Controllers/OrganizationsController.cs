using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Yaly.Api.Data;
using Yaly.Api.Data.Entities;
using Yaly.Api.Models;
using Yaly.Api.Services;

namespace Yaly.Api.Controllers;

[ApiController]
[Route("api/orgs")]
public class OrganizationsController : ControllerBase
{
    private const string PlatformEngineer = "platform-engineer";
    private const string Developer = "developer";

    private readonly YalyDbContext _db;
    private readonly IUserContext _userContext;
    private readonly CatalogSyncService _catalogSync;
    private readonly SecretProtector _protector;
    private readonly ILogger<OrganizationsController> _logger;

    public OrganizationsController(
        YalyDbContext db,
        IUserContext userContext,
        CatalogSyncService catalogSync,
        SecretProtector protector,
        ILogger<OrganizationsController> logger)
    {
        _db = db;
        _userContext = userContext;
        _catalogSync = catalogSync;
        _protector = protector;
        _logger = logger;
    }

    [HttpGet]
    public async Task<ActionResult> List()
    {
        var acc = await _userContext.ResolveAsync();
        if (!acc.IsAuthenticated) return Unauthorized();

        var orgs = await (
            from m in _db.Memberships
            join o in _db.Organizations on m.OrgId equals o.Id
            where m.UserId == acc.UserId && m.Status == "active"
            orderby o.Name
            select new { id = o.Id, name = o.Name, slug = o.Slug, role = m.Role }
        ).ToListAsync();

        return Ok(orgs);
    }

    [HttpPost]
    public async Task<ActionResult> Create([FromBody] CreateOrgDto dto)
    {
        var acc = await _userContext.ResolveAsync();
        if (!acc.IsAuthenticated) return Unauthorized();
        if (string.IsNullOrWhiteSpace(dto.Name))
            return BadRequest(new { error = "Organization name is required" });

        var org = new Organization
        {
            Name = dto.Name.Trim(),
            Slug = await UniqueSlugAsync(dto.Name),
            CreatedByUserId = acc.UserId,
        };
        _db.Organizations.Add(org);
        _db.Memberships.Add(new Membership
        {
            OrgId = org.Id,
            UserId = acc.UserId,
            GitHubLogin = acc.User!.GitHubLogin,
            Role = PlatformEngineer,
            Status = "active",
            InvitedByUserId = acc.UserId,
        });
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(Get), new { id = org.Id }, Detail(org, PlatformEngineer));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult> Get(Guid id)
    {
        var acc = await _userContext.ResolveAsync();
        if (!acc.IsAuthenticated) return Unauthorized();

        var mine = await Membership(id, acc.UserId);
        if (mine == null) return Forbid403("You are not a member of this organization");

        var org = await _db.Organizations.FindAsync(id);
        if (org == null) return NotFound();

        var members = await _db.Memberships
            .Where(m => m.OrgId == id)
            .OrderBy(m => m.GitHubLogin)
            .Select(m => new
            {
                id = m.Id,
                gitHubLogin = m.GitHubLogin,
                role = m.Role,
                status = m.Status,
            })
            .ToListAsync();

        return Ok(Detail(org, mine.Role, members));
    }

    [HttpPut("{id}")]
    public async Task<ActionResult> Update(Guid id, [FromBody] UpdateOrgDto dto)
    {
        var (org, error) = await RequirePlatformEngineer(id);
        if (error != null) return error;

        if (!string.IsNullOrWhiteSpace(dto.Name)) org!.Name = dto.Name.Trim();
        if (dto.CatalogRepoUrl != null) org!.CatalogRepoUrl = dto.CatalogRepoUrl.Trim();
        if (!string.IsNullOrWhiteSpace(dto.CatalogBranch)) org!.CatalogBranch = dto.CatalogBranch.Trim();
        if (dto.CatalogRepoToken != null)
        {
            // Empty string clears the token; a value is encrypted before storing.
            org!.CatalogRepoTokenEncrypted = string.IsNullOrWhiteSpace(dto.CatalogRepoToken)
                ? null
                : _protector.Protect(dto.CatalogRepoToken.Trim());
        }
        await _db.SaveChangesAsync();

        return Ok(Detail(org!, PlatformEngineer));
    }

    [HttpPost("{id}/members")]
    public async Task<ActionResult> InviteMember(Guid id, [FromBody] InviteMemberDto dto)
    {
        var (org, error) = await RequirePlatformEngineer(id);
        if (error != null) return error;

        var login = dto.GitHubLogin.Trim();
        if (string.IsNullOrWhiteSpace(login))
            return BadRequest(new { error = "GitHub login is required" });
        var role = dto.Role == PlatformEngineer ? PlatformEngineer : Developer;

        if (await _db.Memberships.AnyAsync(m => m.OrgId == id && m.GitHubLogin == login))
            return Conflict(new { error = $"'{login}' is already a member or invited" });

        var acc = await _userContext.ResolveAsync();
        // Link immediately if that GitHub user has logged into Yaly before.
        var existingUser = await _db.Users.FirstOrDefaultAsync(u => u.GitHubLogin == login);

        var membership = new Membership
        {
            OrgId = id,
            GitHubLogin = login,
            Role = role,
            UserId = existingUser?.Id,
            Status = existingUser != null ? "active" : "pending",
            InvitedByUserId = acc.UserId,
        };
        _db.Memberships.Add(membership);
        await _db.SaveChangesAsync();

        return Ok(new { id = membership.Id, gitHubLogin = login, role, status = membership.Status });
    }

    [HttpPut("{id}/members/{membershipId}")]
    public async Task<ActionResult> UpdateMember(Guid id, Guid membershipId, [FromBody] UpdateMemberDto dto)
    {
        var (_, error) = await RequirePlatformEngineer(id);
        if (error != null) return error;

        var membership = await _db.Memberships.FirstOrDefaultAsync(m => m.Id == membershipId && m.OrgId == id);
        if (membership == null) return NotFound();

        var role = dto.Role == PlatformEngineer ? PlatformEngineer : Developer;
        if (role != PlatformEngineer && await IsLastPlatformEngineer(id, membership))
            return BadRequest(new { error = "An organization must keep at least one platform engineer" });

        membership.Role = role;
        await _db.SaveChangesAsync();
        return Ok(new { id = membership.Id, gitHubLogin = membership.GitHubLogin, role, status = membership.Status });
    }

    [HttpDelete("{id}/members/{membershipId}")]
    public async Task<ActionResult> RemoveMember(Guid id, Guid membershipId)
    {
        var (_, error) = await RequirePlatformEngineer(id);
        if (error != null) return error;

        var membership = await _db.Memberships.FirstOrDefaultAsync(m => m.Id == membershipId && m.OrgId == id);
        if (membership == null) return NotFound();
        if (await IsLastPlatformEngineer(id, membership))
            return BadRequest(new { error = "An organization must keep at least one platform engineer" });

        _db.Memberships.Remove(membership);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("{id}/catalog/sync")]
    public async Task<ActionResult> SyncCatalog(Guid id)
    {
        var (org, error) = await RequirePlatformEngineer(id);
        if (error != null) return error;
        if (string.IsNullOrWhiteSpace(org!.CatalogRepoUrl))
            return BadRequest(new { error = "Set a catalog repository URL first" });

        try
        {
            var count = await _catalogSync.SyncAsync(org);
            org.LastCatalogSyncAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return Ok(new { templateCount = count, lastCatalogSyncAt = org.LastCatalogSyncAt });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Catalog sync failed for org {OrgId}", id);
            return BadRequest(new { error = $"Sync failed: {ex.Message}" });
        }
    }

    // --- helpers ---

    private Task<Membership?> Membership(Guid orgId, Guid userId) =>
        _db.Memberships.FirstOrDefaultAsync(m => m.OrgId == orgId && m.UserId == userId && m.Status == "active");

    private async Task<(Organization? org, ActionResult? error)> RequirePlatformEngineer(Guid orgId)
    {
        var acc = await _userContext.ResolveAsync();
        if (!acc.IsAuthenticated) return (null, Unauthorized());

        var mine = await Membership(orgId, acc.UserId);
        if (mine == null) return (null, Forbid403("You are not a member of this organization"));
        if (mine.Role != PlatformEngineer)
            return (null, Forbid403("Only a platform engineer can do this"));

        var org = await _db.Organizations.FindAsync(orgId);
        if (org == null) return (null, NotFound());
        return (org, null);
    }

    private async Task<bool> IsLastPlatformEngineer(Guid orgId, Membership candidate)
    {
        if (candidate.Role != PlatformEngineer) return false;
        var count = await _db.Memberships
            .CountAsync(m => m.OrgId == orgId && m.Role == PlatformEngineer && m.Status == "active");
        return count <= 1;
    }

    private ActionResult Forbid403(string message) => StatusCode(403, new { error = message });

    private static object Detail(Organization org, string role, object? members = null) => new
    {
        id = org.Id,
        name = org.Name,
        slug = org.Slug,
        catalogRepoUrl = org.CatalogRepoUrl,
        catalogBranch = org.CatalogBranch,
        lastCatalogSyncAt = org.LastCatalogSyncAt,
        // The token itself is never returned — only whether one is set.
        hasCatalogToken = !string.IsNullOrEmpty(org.CatalogRepoTokenEncrypted),
        role,
        members,
    };

    private async Task<string> UniqueSlugAsync(string name)
    {
        var baseSlug = Regex.Replace(name.ToLowerInvariant(), "[^a-z0-9]+", "-").Trim('-');
        if (string.IsNullOrEmpty(baseSlug)) baseSlug = "org";
        var slug = baseSlug;
        var n = 2;
        while (await _db.Organizations.AnyAsync(o => o.Slug == slug))
            slug = $"{baseSlug}-{n++}";
        return slug;
    }
}
