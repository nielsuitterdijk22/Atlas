using LibGit2Sharp;
using Yaly.Api.Data.Entities;

namespace Yaly.Api.Services;

/// <summary>Clones an organization's catalog Git repo into its local cache directory.</summary>
public class CatalogSyncService
{
    private readonly CatalogService _catalog;
    private readonly SecretProtector _protector;
    private readonly ILogger<CatalogSyncService> _logger;

    public CatalogSyncService(CatalogService catalog, SecretProtector protector, ILogger<CatalogSyncService> logger)
    {
        _catalog = catalog;
        _protector = protector;
        _logger = logger;
    }

    /// <summary>Fresh-clones the org's catalog repo and reloads its templates. Returns the template count.</summary>
    public Task<int> SyncAsync(Organization org)
    {
        if (string.IsNullOrWhiteSpace(org.CatalogRepoUrl))
            throw new InvalidOperationException("Organization has no catalog repository URL");

        var path = _catalog.OrgCachePath(org.Id);
        if (Directory.Exists(path))
            DeleteDirectory(path);
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);

        // Clone the repository's default branch — forcing a branch name that doesn't
        // exist (e.g. "main" on a "master" repo) fails the clone outright.
        var options = new CloneOptions();

        // Use the org's stored access token for private repos.
        var token = _protector.TryUnprotect(org.CatalogRepoTokenEncrypted);
        if (!string.IsNullOrEmpty(token))
        {
            options.FetchOptions.CredentialsProvider = (_, _, _) =>
                new UsernamePasswordCredentials { Username = token, Password = string.Empty };
        }

        _logger.LogInformation("Cloning catalog {Repo} ({Branch}) for org {OrgId}",
            org.CatalogRepoUrl, org.CatalogBranch, org.Id);
        Repository.Clone(org.CatalogRepoUrl, path, options);

        // Switch to the requested branch only when it differs from the default.
        var wanted = org.CatalogBranch?.Trim();
        using (var repo = new Repository(path))
        {
            var current = repo.Head.FriendlyName;
            if (!string.IsNullOrEmpty(wanted) && !string.Equals(wanted, current, StringComparison.Ordinal))
            {
                var remoteBranch = repo.Branches[$"origin/{wanted}"];
                if (remoteBranch == null)
                    throw new InvalidOperationException(
                        $"Branch '{wanted}' not found in the repository (its default branch is '{current}').");

                var localBranch = repo.CreateBranch(wanted, remoteBranch.Tip);
                Commands.Checkout(repo, localBranch);
            }
        }

        _catalog.Reload(org.Id);
        return Task.FromResult(_catalog.GetAll(org.Id).Count);
    }

    /// <summary>Recursively deletes a directory, clearing read-only flags (e.g. in .git).</summary>
    private static void DeleteDirectory(string path)
    {
        foreach (var file in Directory.GetFiles(path, "*", SearchOption.AllDirectories))
            File.SetAttributes(file, FileAttributes.Normal);
        Directory.Delete(path, recursive: true);
    }
}
