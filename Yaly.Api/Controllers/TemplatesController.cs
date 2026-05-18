using Microsoft.AspNetCore.Mvc;
using Yaly.Api.Models;
using Yaly.Api.Services;

namespace Yaly.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TemplatesController : OrgControllerBase
{
    private readonly CatalogService _catalog;
    private readonly ProvisioningService _provisioning;

    public TemplatesController(CatalogService catalog, ProvisioningService provisioning, IUserContext userContext)
        : base(userContext)
    {
        _catalog = catalog;
        _provisioning = provisioning;
    }

    [HttpGet]
    public async Task<ActionResult<List<TemplateDefinition>>> List()
    {
        var (acc, error) = await RequireOrgAsync();
        if (error != null) return error;
        return _catalog.GetAll(acc.OrgId);
    }

    [HttpGet("{name}")]
    public async Task<ActionResult<TemplateDefinition>> Get(string name)
    {
        var (acc, error) = await RequireOrgAsync();
        if (error != null) return error;

        var entry = _catalog.Get(acc.OrgId, name);
        if (entry == null)
            return NotFound(new { error = $"Template '{name}' not found" });

        return entry.Value.Definition;
    }

    [HttpPost("{name}/execute")]
    public async Task<ActionResult<ExecuteResult>> Execute(string name, [FromBody] ExecuteRequest request)
    {
        var (acc, error) = await RequireOrgAsync();
        if (error != null) return error;

        var entry = _catalog.Get(acc.OrgId, name);
        if (entry == null)
            return NotFound(new { error = $"Template '{name}' not found" });

        var (definition, basePath) = entry.Value;
        var values = ProvisioningService.NormalizeValues(request.Values);

        var validationError = ProvisioningService.ValidateRequired(definition.Spec, values);
        if (validationError != null)
            return BadRequest(new { error = validationError });

        var outcome = await _provisioning.RunAsync(acc.OrgId, definition, basePath, values, request.Preset);
        if (!outcome.Result.Success)
            return StatusCode(500, outcome.Result);

        return outcome.Result;
    }
}
