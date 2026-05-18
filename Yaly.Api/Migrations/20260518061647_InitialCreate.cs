using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Yaly.Api.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ExecutionLogs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TemplateName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    TemplateTitle = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    CommitSha = table.Column<string>(type: "text", nullable: true),
                    CommitUrl = table.Column<string>(type: "text", nullable: true),
                    ErrorMessage = table.Column<string>(type: "text", nullable: true),
                    ValuesJson = table.Column<string>(type: "jsonb", nullable: true),
                    FilesCreated = table.Column<string>(type: "jsonb", nullable: false),
                    OutputTarget = table.Column<string>(type: "text", nullable: true),
                    OutputRepo = table.Column<string>(type: "text", nullable: true),
                    ExecutedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    DurationMs = table.Column<double>(type: "double precision", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ExecutionLogs", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "OutputPresets",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "text", nullable: true),
                    Type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Repo = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    Branch = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false, defaultValue: "main"),
                    Path = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false, defaultValue: "/"),
                    CommitMessageTemplate = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    GitHubTokenEnv = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OutputPresets", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ProvisioningRequests",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TemplateName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    TemplateTitle = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Team = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Owner = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    RequiresApproval = table.Column<bool>(type: "boolean", nullable: false),
                    ValuesJson = table.Column<string>(type: "jsonb", nullable: true),
                    SubmittedBy = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    ApprovedBy = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    ApprovedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    RejectionReason = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CompletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ErrorMessage = table.Column<string>(type: "text", nullable: true),
                    CommitSha = table.Column<string>(type: "text", nullable: true),
                    CommitUrl = table.Column<string>(type: "text", nullable: true),
                    ExecutionLogId = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProvisioningRequests", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Services",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    TemplateName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    ServiceType = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Team = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Owner = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Lifecycle = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Description = table.Column<string>(type: "text", nullable: true),
                    RepoUrl = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    RequestId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Services", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ExecutionLogs_ExecutedAt",
                table: "ExecutionLogs",
                column: "ExecutedAt");

            migrationBuilder.CreateIndex(
                name: "IX_ExecutionLogs_TemplateName",
                table: "ExecutionLogs",
                column: "TemplateName");

            migrationBuilder.CreateIndex(
                name: "IX_OutputPresets_Name",
                table: "OutputPresets",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ProvisioningRequests_CreatedAt",
                table: "ProvisioningRequests",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_ProvisioningRequests_Status",
                table: "ProvisioningRequests",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_Services_CreatedAt",
                table: "Services",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_Services_Team",
                table: "Services",
                column: "Team");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ExecutionLogs");

            migrationBuilder.DropTable(
                name: "OutputPresets");

            migrationBuilder.DropTable(
                name: "ProvisioningRequests");

            migrationBuilder.DropTable(
                name: "Services");
        }
    }
}
