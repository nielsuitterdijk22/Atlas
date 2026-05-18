using Microsoft.EntityFrameworkCore;
using Yaly.Api.Data.Entities;

namespace Yaly.Api.Data;

public class YalyDbContext : DbContext
{
    public YalyDbContext(DbContextOptions<YalyDbContext> options) : base(options) { }

    public DbSet<ExecutionLog> ExecutionLogs => Set<ExecutionLog>();
    public DbSet<OutputPreset> OutputPresets => Set<OutputPreset>();
    public DbSet<ProvisioningRequest> ProvisioningRequests => Set<ProvisioningRequest>();
    public DbSet<Service> Services => Set<Service>();
    public DbSet<User> Users => Set<User>();
    public DbSet<Organization> Organizations => Set<Organization>();
    public DbSet<Membership> Memberships => Set<Membership>();

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
            entity.HasIndex(e => e.OrgId);
        });

        modelBuilder.Entity<OutputPreset>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
            entity.HasIndex(e => new { e.OrgId, e.Name }).IsUnique();
            entity.Property(e => e.Type).IsRequired().HasMaxLength(50);
            entity.Property(e => e.Repo).IsRequired().HasMaxLength(500);
            entity.Property(e => e.Branch).HasMaxLength(200).HasDefaultValue("main");
            entity.Property(e => e.Path).HasMaxLength(500).HasDefaultValue("/");
            entity.Property(e => e.CommitMessageTemplate).HasMaxLength(1000);
            entity.Property(e => e.GitHubTokenEnv).HasMaxLength(200);
        });

        modelBuilder.Entity<ProvisioningRequest>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.TemplateName).IsRequired().HasMaxLength(200);
            entity.Property(e => e.TemplateTitle).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Team).HasMaxLength(200);
            entity.Property(e => e.Owner).HasMaxLength(200);
            entity.Property(e => e.Status).IsRequired().HasMaxLength(50);
            entity.Property(e => e.SubmittedBy).HasMaxLength(200);
            entity.Property(e => e.ApprovedBy).HasMaxLength(200);
            entity.Property(e => e.ValuesJson).HasColumnType("jsonb");
            entity.HasIndex(e => e.CreatedAt);
            entity.HasIndex(e => e.Status);
            entity.HasIndex(e => e.OrgId);
        });

        modelBuilder.Entity<Service>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
            entity.Property(e => e.TemplateName).HasMaxLength(200);
            entity.Property(e => e.ServiceType).HasMaxLength(100);
            entity.Property(e => e.Team).HasMaxLength(200);
            entity.Property(e => e.Owner).HasMaxLength(200);
            entity.Property(e => e.Lifecycle).HasMaxLength(50);
            entity.HasIndex(e => e.CreatedAt);
            entity.HasIndex(e => e.Team);
            entity.HasIndex(e => e.OrgId);
        });

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.GitHubLogin).IsRequired().HasMaxLength(200);
            entity.Property(e => e.DisplayName).HasMaxLength(200);
            entity.Property(e => e.Email).HasMaxLength(320);
            entity.Property(e => e.AvatarUrl).HasMaxLength(500);
            entity.HasIndex(e => e.GitHubId).IsUnique();
        });

        modelBuilder.Entity<Organization>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Slug).IsRequired().HasMaxLength(120);
            entity.HasIndex(e => e.Slug).IsUnique();
            entity.Property(e => e.CatalogRepoUrl).HasMaxLength(500);
            entity.Property(e => e.CatalogBranch).HasMaxLength(200).HasDefaultValue("main");
        });

        modelBuilder.Entity<Membership>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.GitHubLogin).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Role).IsRequired().HasMaxLength(50);
            entity.Property(e => e.Status).IsRequired().HasMaxLength(50);
            entity.HasIndex(e => new { e.OrgId, e.GitHubLogin }).IsUnique();
            entity.HasIndex(e => e.UserId);
        });
    }
}
