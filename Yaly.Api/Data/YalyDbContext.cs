using Microsoft.EntityFrameworkCore;
using Yaly.Api.Data.Entities;

namespace Yaly.Api.Data;

public class YalyDbContext : DbContext
{
    public YalyDbContext(DbContextOptions<YalyDbContext> options) : base(options) { }

    public DbSet<ExecutionLog> ExecutionLogs => Set<ExecutionLog>();
    public DbSet<OutputPreset> OutputPresets => Set<OutputPreset>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<ExecutionLog>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.TemplateName).IsRequired().HasMaxLength(200);
            entity.Property(e => e.TemplateTitle).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Status).IsRequired().HasMaxLength(50);
            entity.Property(e => e.ValuesJson).HasColumnType("jsonb");
            entity.Property(e => e.FilesCreated)
                .HasColumnType("jsonb")
                .HasConversion(
                    v => System.Text.Json.JsonSerializer.Serialize(v, (System.Text.Json.JsonSerializerOptions?)null),
                    v => System.Text.Json.JsonSerializer.Deserialize<List<string>>(v, (System.Text.Json.JsonSerializerOptions?)null) ?? new());
            entity.HasIndex(e => e.ExecutedAt);
            entity.HasIndex(e => e.TemplateName);
        });

        modelBuilder.Entity<OutputPreset>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
            entity.HasIndex(e => e.Name).IsUnique();
            entity.Property(e => e.Type).IsRequired().HasMaxLength(50);
            entity.Property(e => e.Repo).IsRequired().HasMaxLength(500);
            entity.Property(e => e.Branch).HasMaxLength(200).HasDefaultValue("main");
            entity.Property(e => e.Path).HasMaxLength(500).HasDefaultValue("/");
            entity.Property(e => e.CommitMessageTemplate).HasMaxLength(1000);
            entity.Property(e => e.GitHubTokenEnv).HasMaxLength(200);
        });
    }
}
