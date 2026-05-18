using YamlDotNet.Serialization;
using YamlDotNet.Serialization.NamingConventions;
using Yaly.Api.Models;

namespace Yaly.Api.Services;

/// <summary>
/// Loads templates per organization from <c>catalog-cache/&lt;orgId&gt;/</c>, which is
/// populated by <see cref="CatalogSyncService"/> from the org's catalog Git repo.
/// </summary>
public class CatalogService
{
    private readonly string _cacheRoot;
    private readonly ILogger<CatalogService> _logger;
    private readonly IDeserializer _deserializer;
    private readonly object _sync = new();
    private readonly Dictionary<Guid, Dictionary<string, (TemplateDefinition Definition, string BasePath)>> _byOrg = new();

    public CatalogService(IConfiguration config, ILogger<CatalogService> logger)
    {
        _cacheRoot = config.GetValue<string>("Catalog:CachePath")
            ?? Path.Combine(Directory.GetCurrentDirectory(), "..", "catalog-cache");
        _logger = logger;
        _deserializer = new DeserializerBuilder()
            .WithNamingConvention(CamelCaseNamingConvention.Instance)
            .IgnoreUnmatchedProperties()
            .Build();
    }

    /// <summary>Local directory holding an org's cloned catalog.</summary>
    public string OrgCachePath(Guid orgId) => Path.GetFullPath(Path.Combine(_cacheRoot, orgId.ToString()));

    public List<TemplateDefinition> GetAll(Guid orgId)
    {
        lock (_sync)
        {
            return EnsureLoaded(orgId).Values.Select(t => t.Definition).ToList();
        }
    }

    public (TemplateDefinition Definition, string BasePath)? Get(Guid orgId, string name)
    {
        lock (_sync)
        {
            return EnsureLoaded(orgId).TryGetValue(name, out var template) ? template : null;
        }
    }

    /// <summary>Discards the cached templates for an org so the next access re-reads disk.</summary>
    public void Reload(Guid orgId)
    {
        lock (_sync)
        {
            _byOrg[orgId] = LoadFromDisk(orgId);
        }
    }

    private Dictionary<string, (TemplateDefinition Definition, string BasePath)> EnsureLoaded(Guid orgId)
    {
        if (!_byOrg.TryGetValue(orgId, out var templates))
        {
            templates = LoadFromDisk(orgId);
            _byOrg[orgId] = templates;
        }
        return templates;
    }

    private Dictionary<string, (TemplateDefinition Definition, string BasePath)> LoadFromDisk(Guid orgId)
    {
        var templates = new Dictionary<string, (TemplateDefinition Definition, string BasePath)>();
        var catalogDir = OrgCachePath(orgId);

        if (!Directory.Exists(catalogDir))
        {
            _logger.LogInformation("No catalog cache for org {OrgId} yet", orgId);
            return templates;
        }

        foreach (var formFile in Directory.GetFiles(catalogDir, "form.yaml", SearchOption.AllDirectories))
        {
            try
            {
                var yaml = File.ReadAllText(formFile);
                var definition = _deserializer.Deserialize<TemplateDefinition>(yaml);
                var basePath = Path.GetDirectoryName(formFile)!;
                templates[definition.Metadata.Name] = (definition, basePath);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to load template from {File}", formFile);
            }
        }

        _logger.LogInformation("Loaded {Count} templates for org {OrgId}", templates.Count, orgId);
        return templates;
    }
}
