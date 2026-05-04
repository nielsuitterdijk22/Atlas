using System.Diagnostics;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Yaly.Api.Data;
using Yaly.Api.Data.Entities;
using Yaly.Api.Models;
using Yaly.Api.Services;

namespace Yaly.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TemplatesController : ControllerBase
{
    private readonly CatalogService _catalog;
    private readonly TemplateRenderer _renderer;
    private readonly GitLocalService _gitLocal;
    private readonly GitHubService _gitHub;
    private readonly YalyDbContext _db;
    private readonly ILogger<TemplatesController> _logger;

    public TemplatesController(
        CatalogService catalog,
        TemplateRenderer renderer,
        GitLocalService gitLocal,
        GitHubService gitHub,
        YalyDbContext db,
        ILogger<TemplatesController> logger)
    {
        _catalog = catalog;
        _renderer = renderer;
        _gitLocal = gitLocal;
        _gitHub = gitHub;
        _db = db;
        _logger = logger;
    }

    [HttpGet]
    public ActionResult<List<TemplateDefinition>> List()
    {
        return _catalog.GetAll();
    }

    [HttpGet("{name}")]
    public ActionResult<TemplateDefinition> Get(string name)
    {
        var entry = _catalog.Get(name);
        if (entry == null)
        {
            return NotFound(new { error = $"Template '{name}' not found" });
        }

        return entry.Value.Definition;
    }

    [HttpPost("{name}/execute")]
    public async Task<ActionResult<ExecuteResult>> Execute(string name, [FromBody] ExecuteRequest request)
    {
        var entry = _catalog.Get(name);
        if (entry == null)
        {
            return NotFound(new { error = $"Template '{name}' not found" });
        }

        var stopwatch = Stopwatch.StartNew();
        var (definition, basePath) = entry.Value;
        var spec = definition.Spec;
        var values = NormalizeValues(request.Values);
        var log = new ExecutionLog
        {
            TemplateName = definition.Metadata.Name,
            TemplateTitle = definition.Metadata.Title,
            Status = "pending",
            ExecutedAt = DateTime.UtcNow
        };

        foreach (var input in spec.Inputs.Where(i => i.Required))
        {
            if (!values.TryGetValue(input.Id, out var value) || value is null)
            {
                log.Status = "failed";
                log.ErrorMessage = $"Required field '{input.Id}' is missing";
                log.ValuesJson = JsonSerializer.Serialize(values);
                await SaveExecutionLogAsync(log, stopwatch.Elapsed.TotalMilliseconds);
                return BadRequest(new { error = log.ErrorMessage });
            }
        }

        foreach (var input in spec.Inputs)
        {
            if (!values.ContainsKey(input.Id) && input.Default is not null)
            {
                values[input.Id] = input.Default;
            }
        }

        log.ValuesJson = JsonSerializer.Serialize(values);

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

        if (!string.IsNullOrWhiteSpace(request.Preset))
        {
            var preset = await _db.OutputPresets.FirstOrDefaultAsync(p => p.Name == request.Preset);
            if (preset == null)
            {
                log.Status = "failed";
                log.ErrorMessage = $"Preset '{request.Preset}' not found";
                await SaveExecutionLogAsync(log, stopwatch.Elapsed.TotalMilliseconds);
                return BadRequest(new { error = log.ErrorMessage });
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

            var result = await outputService.CommitFiles(
                renderedFiles,
                target,
                values,
                gitHubSpec);

            log.Status = result.Success ? "success" : "failed";
            log.CommitSha = result.CommitSha;
            log.CommitUrl = result.CommitUrl;
            log.ErrorMessage = result.Success ? null : result.Message;
            log.FilesCreated = result.FilesCreated;
            await SaveExecutionLogAsync(log, stopwatch.Elapsed.TotalMilliseconds);

            if (!result.Success)
            {
                return StatusCode(500, result);
            }

            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to execute template {Name}", name);
            log.Status = "failed";
            log.ErrorMessage = ex.Message;
            await SaveExecutionLogAsync(log, stopwatch.Elapsed.TotalMilliseconds);
            return StatusCode(500, new ExecuteResult
            {
                Success = false,
                Message = ex.Message
            });
        }
    }

    [HttpPost("reload")]
    public ActionResult Reload()
    {
        _catalog.LoadCatalog();
        return Ok(new { message = "Catalog reloaded" });
    }

    private async Task SaveExecutionLogAsync(ExecutionLog log, double durationMs)
    {
        log.DurationMs = durationMs;
        _db.ExecutionLogs.Add(log);
        await _db.SaveChangesAsync();
    }

    private static Dictionary<string, object> NormalizeValues(Dictionary<string, object> values)
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
                JsonValueKind.Object => element.EnumerateObject().ToDictionary(property => property.Name, property => NormalizeValue(property.Value)),
                JsonValueKind.Null => null!,
                _ => element.ToString()
            };
        }

        return value;
    }
}
