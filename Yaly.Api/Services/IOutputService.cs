using Yaly.Api.Models;

namespace Yaly.Api.Services;

public interface IOutputService
{
    Task<ExecuteResult> CommitFiles(
        Dictionary<string, string> files,
        TargetSpec target,
        Dictionary<string, object> templateValues,
        GitHubSpec? gitHubSpec = null);
}
