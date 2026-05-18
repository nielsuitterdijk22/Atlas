using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Yaly.Api.Data;
using Yaly.Api.Data.Entities;
using Yaly.Api.Models;
using Yaly.Api.Services;

namespace Yaly.Api.Controllers;

[ApiController]
[Route("api/requests")]
public class RequestsController : OrgControllerBase
{
    private readonly YalyDbContext _db;
    private readonly CatalogService _catalog;
    private readonly ProvisioningService _provisioning;
    private readonly ILogger<RequestsController> _logger;

    public RequestsController(
        YalyDbContext db,
        CatalogService catalog,
        ProvisioningService provisioning,
        IUserContext userContext,
        ILogger<RequestsController> logger)
        : base(userContext)
    {
        _db = db;
        _catalog = catalog;
        _provisioning = provisioning;
        _logger = logger;
    }

    [HttpGet]
    public async Task<ActionResult<List<ProvisioningRequest>>> List([FromQuery] string? status = null)
    {
        var (acc, error) = await RequireOrgAsync();
        if (error != null) return error;

        var query = _db.ProvisioningRequests.Where(r => r.OrgId == acc.OrgId);
        if (!string.IsNullOrEmpty(status))
            query = query.Where(r => r.Status == status);

        return await query.OrderByDescending(r => r.CreatedAt).ToListAsync();
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ProvisioningRequest>> Get(Guid id)
    {
        var (acc, error) = await RequireOrgAsync();
        if (error != null) return error;

        var request = await _db.ProvisioningRequests.FirstOrDefaultAsync(r => r.Id == id && r.OrgId == acc.OrgId);
        if (request == null) return NotFound();
        return request;
    }

    [HttpPost]
    public async Task<ActionResult<ProvisioningRequest>> Create([FromBody] CreateRequestDto dto)
    {
        var (acc, error) = await RequireOrgAsync();
        if (error != null) return error;

        var entry = _catalog.Get(acc.OrgId, dto.TemplateName);
        if (entry == null)
            return NotFound(new { error = $"Template '{dto.TemplateName}' not found" });

        if (string.IsNullOrWhiteSpace(dto.Name))
            return BadRequest(new { error = "Service name is required" });

        var (definition, basePath) = entry.Value;
        var spec = definition.Spec;

        var values = ProvisioningService.NormalizeValues(dto.Values);
        var nameInputId = ResolveNameInput(spec);
        if (nameInputId != null) values[nameInputId] = dto.Name;
        values["name"] = dto.Name;
        values["team"] = dto.Team;
        values["owner"] = dto.Owner;

        var validationError = ProvisioningService.ValidateRequired(spec, values);
        if (validationError != null)
            return BadRequest(new { error = validationError });

        var submittedBy = acc.User!.GitHubLogin;
        var request = new ProvisioningRequest
        {
            OrgId = acc.OrgId,
            TemplateName = definition.Metadata.Name,
            TemplateTitle = definition.Metadata.Title,
            Name = dto.Name,
            Team = dto.Team,
            Owner = string.IsNullOrWhiteSpace(dto.Owner) ? submittedBy : dto.Owner,
            SubmittedBy = submittedBy,
            RequiresApproval = spec.ApprovalRequired,
            ValuesJson = JsonSerializer.Serialize(values),
            Status = spec.ApprovalRequired ? "pending-approval" : "provisioning",
        };

        _db.ProvisioningRequests.Add(request);
        await _db.SaveChangesAsync();

        if (!spec.ApprovalRequired)
            await ProvisionAsync(request, definition, basePath, values);

        return CreatedAtAction(nameof(Get), new { id = request.Id }, request);
    }

    [HttpPost("{id}/approve")]
    public async Task<ActionResult<ProvisioningRequest>> Approve(Guid id, [FromBody] ApproveRequestDto? dto)
    {
        var (acc, error) = await RequireOrgAsync(platformEngineer: true);
        if (error != null) return error;

        var request = await _db.ProvisioningRequests.FirstOrDefaultAsync(r => r.Id == id && r.OrgId == acc.OrgId);
        if (request == null) return NotFound();
        if (request.Status != "pending-approval")
            return BadRequest(new { error = $"Request is not awaiting approval (status: {request.Status})" });

        var entry = _catalog.Get(acc.OrgId, request.TemplateName);
        if (entry == null)
            return BadRequest(new { error = $"Template '{request.TemplateName}' no longer exists" });

        request.ApprovedBy = acc.User!.GitHubLogin;
        request.ApprovedAt = DateTime.UtcNow;
        request.Status = "provisioning";
        await _db.SaveChangesAsync();

        var (definition, basePath) = entry.Value;
        var values = DeserializeValues(request.ValuesJson);
        await ProvisionAsync(request, definition, basePath, values);
        return request;
    }

    [HttpPost("{id}/reject")]
    public async Task<ActionResult<ProvisioningRequest>> Reject(Guid id, [FromBody] RejectRequestDto dto)
    {
        var (acc, error) = await RequireOrgAsync(platformEngineer: true);
        if (error != null) return error;

        var request = await _db.ProvisioningRequests.FirstOrDefaultAsync(r => r.Id == id && r.OrgId == acc.OrgId);
        if (request == null) return NotFound();
        if (request.Status != "pending-approval")
            return BadRequest(new { error = $"Request is not awaiting approval (status: {request.Status})" });

        request.Status = "rejected";
        request.RejectionReason = string.IsNullOrWhiteSpace(dto?.Reason) ? "No reason given" : dto.Reason;
        request.ApprovedBy = acc.User!.GitHubLogin;
        request.CompletedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return request;
    }

    [HttpPost("{id}/retry")]
    public async Task<ActionResult<ProvisioningRequest>> Retry(Guid id)
    {
        var (acc, error) = await RequireOrgAsync();
        if (error != null) return error;

        var request = await _db.ProvisioningRequests.FirstOrDefaultAsync(r => r.Id == id && r.OrgId == acc.OrgId);
        if (request == null) return NotFound();
        if (request.Status != "failed")
            return BadRequest(new { error = $"Only failed requests can be retried (status: {request.Status})" });

        var entry = _catalog.Get(acc.OrgId, request.TemplateName);
        if (entry == null)
            return BadRequest(new { error = $"Template '{request.TemplateName}' no longer exists" });

        request.Status = "provisioning";
        request.ErrorMessage = null;
        await _db.SaveChangesAsync();

        var (definition, basePath) = entry.Value;
        var values = DeserializeValues(request.ValuesJson);
        await ProvisionAsync(request, definition, basePath, values);
        return request;
    }

    /// <summary>Runs provisioning for a request, updates its status, and registers a Service on success.</summary>
    private async Task ProvisionAsync(
        ProvisioningRequest request,
        TemplateDefinition definition,
        string basePath,
        Dictionary<string, object> values)
    {
        var outcome = await _provisioning.RunAsync(request.OrgId, definition, basePath, values, presetName: null);
        var result = outcome.Result;

        request.ExecutionLogId = outcome.ExecutionLogId;
        request.CommitSha = result.CommitSha;
        request.CommitUrl = result.CommitUrl;
        request.CompletedAt = DateTime.UtcNow;

        if (result.Success)
        {
            request.Status = "completed";
            _db.Services.Add(new Service
            {
                OrgId = request.OrgId,
                Name = request.Name,
                TemplateName = definition.Metadata.Name,
                ServiceType = definition.Metadata.ServiceType,
                Team = request.Team,
                Owner = request.Owner,
                Lifecycle = ResolveLifecycle(values),
                Description = values.TryGetValue("description", out var d) ? d?.ToString() : null,
                RepoUrl = result.CommitUrl,
                RequestId = request.Id,
            });
        }
        else
        {
            request.Status = "failed";
            request.ErrorMessage = result.Message;
        }

        await _db.SaveChangesAsync();
    }

    private static string? ResolveNameInput(TemplateSpec spec)
    {
        if (!string.IsNullOrWhiteSpace(spec.NameInput))
            return spec.NameInput;
        if (spec.Inputs.Any(i => i.Id == "name"))
            return "name";
        if (spec.Inputs.Any(i => i.Id == "service_name"))
            return "service_name";
        return spec.Inputs.FirstOrDefault(i => i.Required && i.Type == "string")?.Id;
    }

    private static string ResolveLifecycle(Dictionary<string, object> values)
    {
        var env = (values.TryGetValue("environment", out var e) ? e?.ToString() :
                   values.TryGetValue("env", out var e2) ? e2?.ToString() : null)?.ToLowerInvariant();
        return env switch
        {
            "prod" or "production" => "production",
            "staging" or "test" or "tst" => "staging",
            "dev" or "development" => "development",
            "experimental" => "experimental",
            null or "" => "production",
            _ => env
        };
    }

    private static Dictionary<string, object> DeserializeValues(string? json)
    {
        if (string.IsNullOrWhiteSpace(json))
            return new Dictionary<string, object>();
        var raw = JsonSerializer.Deserialize<Dictionary<string, object>>(json) ?? new();
        return ProvisioningService.NormalizeValues(raw);
    }
}
