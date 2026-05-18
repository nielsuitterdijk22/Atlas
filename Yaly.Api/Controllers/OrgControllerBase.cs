using Microsoft.AspNetCore.Mvc;
using Yaly.Api.Services;

namespace Yaly.Api.Controllers;

/// <summary>Base for controllers whose data is scoped to the caller's active organization.</summary>
public abstract class OrgControllerBase : ControllerBase
{
    private readonly IUserContext _userContext;

    protected OrgControllerBase(IUserContext userContext)
    {
        _userContext = userContext;
    }

    /// <summary>
    /// Resolves the caller's access context, returning an error result when they are
    /// unauthenticated, have no valid active organization, or lack the required role.
    /// </summary>
    protected async Task<(AccessContext acc, ActionResult? error)> RequireOrgAsync(bool platformEngineer = false)
    {
        var acc = await _userContext.ResolveAsync();
        if (!acc.IsAuthenticated)
            return (acc, Unauthorized());
        if (!acc.HasOrg)
            return (acc, StatusCode(403, new { error = "No active organization — send a valid X-Yaly-Org header." }));
        if (platformEngineer && !acc.IsPlatformEngineer)
            return (acc, StatusCode(403, new { error = "Platform engineer role required" }));
        return (acc, null);
    }
}
