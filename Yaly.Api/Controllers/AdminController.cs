using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Yaly.Api.Data;
using Yaly.Api.Data.Entities;

namespace Yaly.Api.Controllers;

[ApiController]
[Route("api/admin")]
public class AdminController : ControllerBase
{
    private readonly YalyDbContext _db;

    public AdminController(YalyDbContext db)
    {
        _db = db;
    }

    [HttpGet("executions")]
    public async Task<ActionResult<ExecutionListResponse>> GetExecutions(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? template = null,
        [FromQuery] string? status = null)
    {
        var query = _db.ExecutionLogs.AsQueryable();

        if (!string.IsNullOrEmpty(template))
            query = query.Where(e => e.TemplateName == template);
        if (!string.IsNullOrEmpty(status))
            query = query.Where(e => e.Status == status);

        var total = await query.CountAsync();
        var items = await query
            .OrderByDescending(e => e.ExecutedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return new ExecutionListResponse
        {
            Items = items,
            Total = total,
            Page = page,
            PageSize = pageSize
        };
    }

    [HttpGet("executions/{id}")]
    public async Task<ActionResult<ExecutionLog>> GetExecution(Guid id)
    {
        var log = await _db.ExecutionLogs.FindAsync(id);
        if (log == null) return NotFound();
        return log;
    }

    [HttpGet("presets")]
    public async Task<ActionResult<List<OutputPreset>>> GetPresets()
    {
        return await _db.OutputPresets.OrderBy(p => p.Name).ToListAsync();
    }

    [HttpGet("presets/{id}")]
    public async Task<ActionResult<OutputPreset>> GetPreset(Guid id)
    {
        var preset = await _db.OutputPresets.FindAsync(id);
        if (preset == null) return NotFound();
        return preset;
    }

    [HttpPost("presets")]
    public async Task<ActionResult<OutputPreset>> CreatePreset([FromBody] OutputPreset preset)
    {
        if (string.IsNullOrWhiteSpace(preset.Name))
            return BadRequest(new { error = "Name is required" });
        if (string.IsNullOrWhiteSpace(preset.Repo))
            return BadRequest(new { error = "Repo is required" });

        var existing = await _db.OutputPresets.FirstOrDefaultAsync(p => p.Name == preset.Name);
        if (existing != null)
            return Conflict(new { error = $"Preset '{preset.Name}' already exists" });

        preset.Id = Guid.NewGuid();
        preset.CreatedAt = DateTime.UtcNow;
        preset.UpdatedAt = DateTime.UtcNow;

        _db.OutputPresets.Add(preset);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetPreset), new { id = preset.Id }, preset);
    }

    [HttpPut("presets/{id}")]
    public async Task<ActionResult<OutputPreset>> UpdatePreset(Guid id, [FromBody] OutputPreset update)
    {
        var preset = await _db.OutputPresets.FindAsync(id);
        if (preset == null) return NotFound();

        if (!string.IsNullOrWhiteSpace(update.Name)) preset.Name = update.Name;
        if (!string.IsNullOrWhiteSpace(update.Repo)) preset.Repo = update.Repo;
        preset.Description = update.Description;
        preset.Type = string.IsNullOrWhiteSpace(update.Type) ? preset.Type : update.Type;
        preset.Branch = string.IsNullOrWhiteSpace(update.Branch) ? preset.Branch : update.Branch;
        preset.Path = string.IsNullOrWhiteSpace(update.Path) ? preset.Path : update.Path;
        preset.CommitMessageTemplate = update.CommitMessageTemplate;
        preset.GitHubTokenEnv = update.GitHubTokenEnv;
        preset.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return preset;
    }

    [HttpDelete("presets/{id}")]
    public async Task<ActionResult> DeletePreset(Guid id)
    {
        var preset = await _db.OutputPresets.FindAsync(id);
        if (preset == null) return NotFound();

        _db.OutputPresets.Remove(preset);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}

public class ExecutionListResponse
{
    public List<ExecutionLog> Items { get; set; } = new();
    public int Total { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
}
