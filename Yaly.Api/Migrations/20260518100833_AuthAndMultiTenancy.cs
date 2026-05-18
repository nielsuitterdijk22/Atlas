using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Yaly.Api.Migrations
{
    /// <inheritdoc />
    public partial class AuthAndMultiTenancy : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_OutputPresets_Name",
                table: "OutputPresets");

            migrationBuilder.AddColumn<Guid>(
                name: "OrgId",
                table: "Services",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<Guid>(
                name: "OrgId",
                table: "ProvisioningRequests",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<Guid>(
                name: "OrgId",
                table: "OutputPresets",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<Guid>(
                name: "OrgId",
                table: "ExecutionLogs",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.CreateTable(
                name: "Memberships",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    OrgId = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: true),
                    GitHubLogin = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Role = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    InvitedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Memberships", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Organizations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Slug = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    CatalogRepoUrl = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    CatalogBranch = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false, defaultValue: "main"),
                    LastCatalogSyncAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Organizations", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Users",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    GitHubId = table.Column<long>(type: "bigint", nullable: false),
                    GitHubLogin = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    DisplayName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Email = table.Column<string>(type: "character varying(320)", maxLength: 320, nullable: true),
                    AvatarUrl = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    LastLoginAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Users", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Services_OrgId",
                table: "Services",
                column: "OrgId");

            migrationBuilder.CreateIndex(
                name: "IX_ProvisioningRequests_OrgId",
                table: "ProvisioningRequests",
                column: "OrgId");

            migrationBuilder.CreateIndex(
                name: "IX_OutputPresets_OrgId_Name",
                table: "OutputPresets",
                columns: new[] { "OrgId", "Name" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ExecutionLogs_OrgId",
                table: "ExecutionLogs",
                column: "OrgId");

            migrationBuilder.CreateIndex(
                name: "IX_Memberships_OrgId_GitHubLogin",
                table: "Memberships",
                columns: new[] { "OrgId", "GitHubLogin" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Memberships_UserId",
                table: "Memberships",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_Organizations_Slug",
                table: "Organizations",
                column: "Slug",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Users_GitHubId",
                table: "Users",
                column: "GitHubId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Memberships");

            migrationBuilder.DropTable(
                name: "Organizations");

            migrationBuilder.DropTable(
                name: "Users");

            migrationBuilder.DropIndex(
                name: "IX_Services_OrgId",
                table: "Services");

            migrationBuilder.DropIndex(
                name: "IX_ProvisioningRequests_OrgId",
                table: "ProvisioningRequests");

            migrationBuilder.DropIndex(
                name: "IX_OutputPresets_OrgId_Name",
                table: "OutputPresets");

            migrationBuilder.DropIndex(
                name: "IX_ExecutionLogs_OrgId",
                table: "ExecutionLogs");

            migrationBuilder.DropColumn(
                name: "OrgId",
                table: "Services");

            migrationBuilder.DropColumn(
                name: "OrgId",
                table: "ProvisioningRequests");

            migrationBuilder.DropColumn(
                name: "OrgId",
                table: "OutputPresets");

            migrationBuilder.DropColumn(
                name: "OrgId",
                table: "ExecutionLogs");

            migrationBuilder.CreateIndex(
                name: "IX_OutputPresets_Name",
                table: "OutputPresets",
                column: "Name",
                unique: true);
        }
    }
}
