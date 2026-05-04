using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
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
    private readonly ILogger<TemplatesController> _logger;

    public TemplatesController(
        CatalogService catalog,
        TemplateRenderer renderer,
        GitLocalService gitLocal,
        GitHubService gitHub,
        ILogger<TemplatesController> logger)
    {
        _catalog = catalog;
        _renderer = renderer;
        _gitLocal = gitLocal;
        _gitHub = gitHub;
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

        var (definition, basePath) = entry.Value;
        var spec = definition.Spec;
        var values = NormalizeValues(request.Values);

        foreach (var input in spec.Inputs.Where(i => i.Required))
        {
            if (!values.TryGetValue(input.Id, out var value) || value is null)
            {
                return BadRequest(new { error = $"Required field '{input.Id}' is missing" });
            }
        }

        foreach (var input in spec.Inputs)
        {
            if (!values.ContainsKey(input.Id) && input.Default is not null)
            {
                values[input.Id] = input.Default;
            }
        }

        try
        {
            var skeletonPath = Path.GetFullPath(Path.Combine(basePath, spec.Output.Template));
            var renderedFiles = _renderer.RenderTemplateFolder(skeletonPath, values);

            IOutputService outputService = spec.Output.Target.Type.ToLowerInvariant() switch
            {
                "github" => _gitHub,
                "local" => _gitLocal,
                _ => throw new ArgumentException($"Unknown target type: {spec.Output.Target.Type}")
            };

            var result = await outputService.CommitFiles(
                renderedFiles,
                spec.Output.Target,
                values,
                spec.Output.GitHub);

            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to execute template {Name}", name);
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
