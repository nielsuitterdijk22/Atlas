namespace Yaly.Api.Models;

public class CreateOrgDto
{
    public string Name { get; set; } = "";
}

public class UpdateOrgDto
{
    public string? Name { get; set; }
    public string? CatalogRepoUrl { get; set; }
    public string? CatalogBranch { get; set; }

    /// <summary>New catalog repo access token. Null = leave unchanged; empty = clear.</summary>
    public string? CatalogRepoToken { get; set; }
}

public class InviteMemberDto
{
    public string GitHubLogin { get; set; } = "";
    public string Role { get; set; } = "developer";
}

public class UpdateMemberDto
{
    public string Role { get; set; } = "developer";
}
