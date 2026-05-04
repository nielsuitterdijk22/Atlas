using Octokit;
using Yaly.Api.Models;

namespace Yaly.Api.Services;

public class GitHubService : IOutputService
{
    private readonly ILogger<GitHubService> _logger;
    private readonly TemplateRenderer _renderer;

    public GitHubService(ILogger<GitHubService> logger, TemplateRenderer renderer)
    {
        _logger = logger;
        _renderer = renderer;
    }

    public async Task<ExecuteResult> CommitFiles(
        Dictionary<string, string> files,
        TargetSpec target,
        Dictionary<string, object> templateValues,
        GitHubSpec? gitHubSpec = null)
    {
        var result = new ExecuteResult();

        try
        {
            var tokenEnv = gitHubSpec?.TokenEnv ?? "GITHUB_TOKEN";
            var token = Environment.GetEnvironmentVariable(tokenEnv)
                ?? throw new InvalidOperationException($"Environment variable '{tokenEnv}' not set");

            var client = new GitHubClient(new ProductHeaderValue("Yaly"))
            {
                Credentials = new Credentials(token)
            };

            var repoFullName = _renderer.RenderString(target.Repo, templateValues);
            var parts = repoFullName.Split('/');
            if (parts.Length != 2)
            {
                throw new ArgumentException($"Invalid repo format: {repoFullName}. Expected 'owner/repo'.");
            }

            var owner = parts[0];
            var repoName = parts[1];
            var branch = target.Branch;
            var basePath = target.Path.TrimStart('/');

            var reference = await client.Git.Reference.Get(owner, repoName, $"heads/{branch}");
            var latestCommit = await client.Git.Commit.Get(owner, repoName, reference.Object.Sha);

            var treeItems = new List<NewTreeItem>();
            foreach (var (relativePath, content) in files)
            {
                var filePath = string.IsNullOrEmpty(basePath)
                    ? relativePath
                    : $"{basePath}/{relativePath}";

                treeItems.Add(new NewTreeItem
                {
                    Path = filePath,
                    Mode = "100644",
                    Type = TreeType.Blob,
                    Content = content
                });
            }

            var newTree = new NewTree { BaseTree = latestCommit.Tree.Sha };
            foreach (var item in treeItems)
            {
                newTree.Tree.Add(item);
            }

            var tree = await client.Git.Tree.Create(owner, repoName, newTree);
            var commitMessage = _renderer.RenderString(target.CommitMessage, templateValues);
            var newCommit = new NewCommit(commitMessage, tree.Sha, latestCommit.Sha);
            var commit = await client.Git.Commit.Create(owner, repoName, newCommit);

            await client.Git.Reference.Update(owner, repoName, $"heads/{branch}", new ReferenceUpdate(commit.Sha));

            result.Success = true;
            result.CommitSha = commit.Sha;
            result.CommitUrl = $"https://github.com/{owner}/{repoName}/commit/{commit.Sha}";
            result.Message = $"Committed {files.Count} files to {repoFullName}";
            result.FilesCreated = files.Keys.ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to commit to GitHub");
            result.Success = false;
            result.Message = ex.Message;
        }

        return result;
    }
}
