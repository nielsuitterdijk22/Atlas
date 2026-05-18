using System.Diagnostics;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Yaly.Api.Data;
using Yaly.Api.Data.Entities;
using Yaly.Api.Models;

namespace Yaly.Api.Services;

/// <summary>
/// Owns the render + commit core of executing a template: preset resolution,
/// Scriban rendering, output dispatch, and writing the <see cref="ExecutionLog"/>.
/// Shared by <c>TemplatesController</c> (direct API execute) and <c>RequestsController</c>.
/// </summary>
public class ProvisioningService
{
    private readonly TemplateRenderer _renderer;
    private readonly GitLocalService _gitLocal;
    private readonly GitHubService _gitHub;
    private readonly YalyDbContext _db;
    private readonly ILogger<ProvisioningService> _logger;

    public ProvisioningService(
        TemplateRenderer renderer,
        GitLocalService gitLocal,
        GitHubService gitHub,
        YalyDbContext db,
        ILogger<ProvisioningService> logger)
    {
        _renderer = renderer;
        _gitLocal = gitLocal;
        _gitHub = gitHub;
        _db = db;
        _logger = logger;
    }

    /// <summary>Returns an error message if a required input is missing, otherwise null.</summary>
    public static string? ValidateRequired(TemplateSpec spec, Dictionary<string, object> values)
    {
        foreach (var input in spec.Inputs.Where(i => i.Required))
        {
            if (!values.TryGetValue(input.Id, out var value) || value is null ||
                (value is string s && string.IsNullOrWhiteSpace(s)))
            {
                return $"Required field '{input.Id}' is missing";
            }
        }
        return null;
    }

    /// <summary>Renders the template and commits the result. Writes an ExecutionLog regardless of outcome.</summary>
    public async Task<ProvisioningOutcome> RunAsync(
        Guid orgId,
        TemplateDefinition definition,
        string basePath,
        Dictionary<string, object> values,
        string? presetName)
    {
        var stopwatch = Stopwatch.StartNew();
        var spec = definition.Spec;

        // Fill defaults for any input not explicitly supplied.
        foreach (var input in spec.Inputs)
        {
            if (!values.ContainsKey(input.Id) && input.Default is not null)
            {
                values[input.Id] = input.Default;
            }
        }

        var log = new ExecutionLog
        {
            OrgId = orgId,
            TemplateName = definition.Metadata.Name,
            TemplateTitle = definition.Metadata.Title,
            Status = "pending",
            ExecutedAt = DateTime.UtcNow,
            ValuesJson = JsonSerializer.Serialize(values)
        };

        var target = new TargetSpec
        {
            Type = spec.Output.Target.Type,
            Repo = spec.Output.Target.Repo,
            Branch = spec.Output.Target.Branch,
            Path = spec.Output.Target.Path,
            CommitMessage = spec.Output.Target.CommitMessage
        };
        var gitHubSpec = spec.Output.GitHub is null
            ? null
            : new GitHubSpec { TokenEnv = spec.Output.GitHub.TokenEnv };

        // Resolve preset: API request overrides YAML, YAML overrides default target.
        var resolvedPreset = presetName ?? spec.Output.Preset;
        if (!string.IsNullOrWhiteSpace(resolvedPreset))
        {
            var preset = await _db.OutputPresets.FirstOrDefaultAsync(p => p.OrgId == orgId && p.Name == resolvedPreset);
            if (preset == null)
            {
                log.Status = "failed";
                log.ErrorMessage = $"Preset '{resolvedPreset}' not found";
                await SaveLogAsync(log, stopwatch.Elapsed.TotalMilliseconds);
                return Fail(log);
            }

            target = new TargetSpec
            {
                Type = preset.Type,
                Repo = preset.Repo,
                Branch = preset.Branch,
                Path = preset.Path,
                CommitMessage = string.IsNullOrWhiteSpace(preset.CommitMessageTemplate)
                    ? spec.Output.Target.CommitMessage
                    : preset.CommitMessageTemplate
            };
            gitHubSpec = new GitHubSpec
            {
                TokenEnv = string.IsNullOrWhiteSpace(preset.GitHubTokenEnv)
                    ? spec.Output.GitHub?.TokenEnv ?? "GITHUB_TOKEN"
                    : preset.GitHubTokenEnv
            };
        }

        try
        {
            log.OutputTarget = target.Type;
            log.OutputRepo = _renderer.RenderString(target.Repo, values);

            var skeletonPath = Path.GetFullPath(Path.Combine(basePath, spec.Output.Template));
            var renderedFiles = _renderer.RenderTemplateFolder(skeletonPath, values);

            IOutputService outputService = target.Type.ToLowerInvariant() switch
            {
                "github" => _gitHub,
                "local" => _gitLocal,
                _ => throw new ArgumentException($"Unknown target type: {target.Type}")
            };

            var result = await outputService.CommitFiles(renderedFiles, target, values, gitHubSpec);

            log.Status = result.Success ? "success" : "failed";
            log.CommitSha = result.CommitSha;
            log.CommitUrl = result.CommitUrl;
            log.ErrorMessage = result.Success ? null : result.Message;
            log.FilesCreated = result.FilesCreated;
            await SaveLogAsync(log, stopwatch.Elapsed.TotalMilliseconds);

            return new ProvisioningOutcome { Result = result, ExecutionLogId = log.Id };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to provision template {Name}", definition.Metadata.Name);
            log.Status = "failed";
            log.ErrorMessage = ex.Message;
            await SaveLogAsync(log, stopwatch.Elapsed.TotalMilliseconds);
            return Fail(log);
        }
    }

    private static ProvisioningOutcome Fail(ExecutionLog log) => new()
    {
        Result = new ExecuteResult { Success = false, Message = log.ErrorMessage ?? "Provisioning failed" },
        ExecutionLogId = log.Id
    };

    private async Task SaveLogAsync(ExecutionLog log, double durationMs)
    {
        log.DurationMs = durationMs;
        _db.ExecutionLogs.Add(log);
        await _db.SaveChangesAsync();
    }

    /// <summary>Converts JsonElement values from a deserialized request body into plain CLR types.</summary>
    public static Dictionary<string, object> NormalizeValues(Dictionary<string, object> values)
        => values.ToDictionary(pair => pair.Key, pair => NormalizeValue(pair.Value));

    private static object NormalizeValue(object value)
    {
        if (value is JsonElement element)
        {
            return element.ValueKind switch
            {
                JsonValueKind.String => element.GetString() ?? string.Empty,
                JsonValueKind.Number when element.TryGetInt64(out var longValue) => longValue,
                JsonValueKind.Number when element.TryGetDouble(out var doubleValue) => doubleValue,
                JsonValueKind.True => true,
                JsonValueKind.False => false,
                JsonValueKind.Array => element.EnumerateArray().Select(item => NormalizeValue(item)).ToList(),
                JsonValueKind.Object => element.EnumerateObject().ToDictionary(p => p.Name, p => NormalizeValue(p.Value)),
                JsonValueKind.Null => null!,
                _ => element.ToString()
            };
        }

        return value;
    }
}

public class ProvisioningOutcome
{
    public ExecuteResult Result { get; set; } = new();
    public Guid ExecutionLogId { get; set; }
}
