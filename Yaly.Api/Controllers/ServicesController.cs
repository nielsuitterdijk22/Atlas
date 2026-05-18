using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Yaly.Api.Data;
using Yaly.Api.Data.Entities;
using Yaly.Api.Services;

namespace Yaly.Api.Controllers;

[ApiController]
[Route("api/services")]
public class ServicesController : OrgControllerBase
{
    private readonly YalyDbContext _db;

    public ServicesController(YalyDbContext db, IUserContext userContext) : base(userContext)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<ServiceListResponse>> List(
        [FromQuery] string? search = null,
        [FromQuery] string? team = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 12)
    {
        var (acc, error) = await RequireOrgAsync();
        if (error != null) return error;

        if (page < 1) page = 1;
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = _db.Services.Where(s => s.OrgId == acc.OrgId);

        if (!string.IsNullOrWhiteSpace(team))
            query = query.Where(s => s.Team == team);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.ToLower();
            query = query.Where(s =>
                s.Name.ToLower().Contains(term) ||
                (s.Description != null && s.Description.ToLower().Contains(term)));
        }

        var total = await query.CountAsync();
        var items = await query
            .OrderByDescending(s => s.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return new ServiceListResponse { Items = items, Total = total, Page = page, PageSize = pageSize };
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Service>> Get(Guid id)
    {
        var (acc, error) = await RequireOrgAsync();
        if (error != null) return error;

        var service = await _db.Services.FirstOrDefaultAsync(s => s.Id == id && s.OrgId == acc.OrgId);
        if (service == null) return NotFound();
        return service;
    }
}

public class ServiceListResponse
{
    public List<Service> Items { get; set; } = new();
    public int Total { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
}
