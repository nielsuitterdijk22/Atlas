using LibGit2Sharp;
using Yaly.Api.Models;

namespace Yaly.Api.Services;

public class GitLocalService : IOutputService
{
    private readonly ILogger<GitLocalService> _logger;
    private readonly TemplateRenderer _renderer;

    public GitLocalService(ILogger<GitLocalService> logger, TemplateRenderer renderer)
    {
        _logger = logger;
        _renderer = renderer;
    }

    public Task<ExecuteResult> CommitFiles(
        Dictionary<string, string> files,
        TargetSpec target,
        Dictionary<string, object> templateValues,
        GitHubSpec? gitHubSpec = null)
    {
        var result = new ExecuteResult();

        try
        {
            var repoPath = _renderer.RenderString(target.Repo, templateValues);

            if (!Repository.IsValid(repoPath))
            {
                Directory.CreateDirectory(repoPath);
                Repository.Init(repoPath);
                _logger.LogInformation("Initialized new repo at {Path}", repoPath);
            }

            using var repo = new Repository(repoPath);
            var basePath = target.Path.TrimStart('/');

            foreach (var (relativePath, content) in files)
            {
                var fullPath = Path.Combine(repoPath, basePath, relativePath);
                var directory = Path.GetDirectoryName(fullPath);
                if (!string.IsNullOrEmpty(directory))
                {
                    Directory.CreateDirectory(directory);
                }

                File.WriteAllText(fullPath, content);
                Commands.Stage(repo, Path.Combine(basePath, relativePath));
            }

            var commitMessage = _renderer.RenderString(target.CommitMessage, templateValues);
            var signature = new Signature("Yaly", "yaly@localhost", DateTimeOffset.Now);
            var commit = repo.Commit(commitMessage, signature, signature);

            result.Success = true;
            result.CommitSha = commit.Sha;
            result.Message = $"Committed {files.Count} files to local repo";
            result.FilesCreated = files.Keys.ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to commit to local repo");
            result.Success = false;
            result.Message = ex.Message;
        }

        return Task.FromResult(result);
    }
}
