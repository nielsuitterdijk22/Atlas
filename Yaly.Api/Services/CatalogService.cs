using YamlDotNet.Serialization;
using YamlDotNet.Serialization.NamingConventions;
using Yaly.Api.Models;

namespace Yaly.Api.Services;

public class CatalogService : IDisposable
{
    private readonly string _catalogPath;
    private readonly ILogger<CatalogService> _logger;
    private readonly IDeserializer _deserializer;
    private readonly object _sync = new();
    private Dictionary<string, (TemplateDefinition Definition, string BasePath)> _templates = new();
    private FileSystemWatcher? _watcher;

    public CatalogService(IConfiguration config, ILogger<CatalogService> logger)
    {
        _catalogPath = config.GetValue<string>("Catalog:Path") ?? Path.Combine(Directory.GetCurrentDirectory(), "..", "catalog");
        _logger = logger;
        _deserializer = new DeserializerBuilder()
            .WithNamingConvention(CamelCaseNamingConvention.Instance)
            .IgnoreUnmatchedProperties()
            .Build();

        LoadCatalog();
        ConfigureWatcher();
    }

    public void LoadCatalog()
    {
        var templates = new Dictionary<string, (TemplateDefinition, string)>();
        var catalogDir = Path.GetFullPath(_catalogPath);

        if (!Directory.Exists(catalogDir))
        {
            _logger.LogWarning("Catalog directory not found: {Path}", catalogDir);
            lock (_sync)
            {
                _templates = templates;
            }
            return;
        }

        foreach (var formFile in Directory.GetFiles(catalogDir, "form.yaml", SearchOption.AllDirectories))
        {
            try
            {
                var yaml = File.ReadAllText(formFile);
                var definition = _deserializer.Deserialize<TemplateDefinition>(yaml);
                var basePath = Path.GetDirectoryName(formFile)!;
                templates[definition.Metadata.Name] = (definition, basePath);
                _logger.LogInformation("Loaded template: {Name}", definition.Metadata.Name);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to load template from {File}", formFile);
            }
        }

        lock (_sync)
        {
            _templates = templates;
        }

        _logger.LogInformation("Loaded {Count} templates from catalog", templates.Count);
    }

    public List<TemplateDefinition> GetAll()
    {
        lock (_sync)
        {
            return _templates.Values.Select(t => t.Definition).ToList();
        }
    }

    public (TemplateDefinition Definition, string BasePath)? Get(string name)
    {
        lock (_sync)
        {
            return _templates.TryGetValue(name, out var template) ? template : null;
        }
    }

    private void ConfigureWatcher()
    {
        var catalogDir = Path.GetFullPath(_catalogPath);
        var parentDir = Directory.Exists(catalogDir)
            ? catalogDir
            : Path.GetDirectoryName(catalogDir);

        if (string.IsNullOrWhiteSpace(parentDir) || !Directory.Exists(parentDir))
        {
            _logger.LogWarning("Catalog watcher not started because directory does not exist: {Path}", catalogDir);
            return;
        }

        _watcher = new FileSystemWatcher(parentDir)
        {
            IncludeSubdirectories = true,
            NotifyFilter = NotifyFilters.FileName | NotifyFilters.DirectoryName | NotifyFilters.LastWrite,
            Filter = "*.yaml",
            EnableRaisingEvents = true
        };

        _watcher.Changed += OnCatalogChanged;
        _watcher.Created += OnCatalogChanged;
        _watcher.Deleted += OnCatalogChanged;
        _watcher.Renamed += OnCatalogRenamed;
    }

    private void OnCatalogChanged(object sender, FileSystemEventArgs e)
    {
        if (!IsCatalogFile(e.FullPath))
        {
            return;
        }

        ReloadWithLogging(e.ChangeType.ToString(), e.FullPath);
    }

    private void OnCatalogRenamed(object sender, RenamedEventArgs e)
    {
        if (!IsCatalogFile(e.FullPath) && !IsCatalogFile(e.OldFullPath))
        {
            return;
        }

        ReloadWithLogging("Renamed", e.FullPath);
    }

    private bool IsCatalogFile(string fullPath)
        => string.Equals(Path.GetFileName(fullPath), "form.yaml", StringComparison.OrdinalIgnoreCase);

    private void ReloadWithLogging(string reason, string path)
    {
        try
        {
            _logger.LogInformation("Catalog change detected ({Reason}) at {Path}; reloading", reason, path);
            LoadCatalog();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to reload catalog after change to {Path}", path);
        }
    }

    public void Dispose()
    {
        if (_watcher is null)
        {
            return;
        }

        _watcher.Changed -= OnCatalogChanged;
        _watcher.Created -= OnCatalogChanged;
        _watcher.Deleted -= OnCatalogChanged;
        _watcher.Renamed -= OnCatalogRenamed;
        _watcher.Dispose();
    }
}
