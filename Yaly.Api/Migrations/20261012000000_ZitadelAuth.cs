using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Yaly.Api.Migrations
{
    /// <inheritdoc />
    public partial class ZitadelAuth : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Users_GitHubId",
                table: "Users");

            migrationBuilder.AlterColumn<long>(
                name: "GitHubId",
                table: "Users",
                type: "bigint",
                nullable: true,
                oldClrType: typeof(long),
                oldType: "bigint");

            migrationBuilder.AddColumn<string>(
                name: "Provider",
                table: "Users",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "github");

            migrationBuilder.AddColumn<string>(
                name: "ProviderId",
                table: "Users",
                type: "character varying(200)",
                maxLength: 200,
                nullable: false,
                defaultValue: "");

            // Backfill legacy GitHub users so the new unique key holds.
            migrationBuilder.Sql(
                "UPDATE \"Users\" SET \"ProviderId\" = \"GitHubId\"::text WHERE \"ProviderId\" = '' AND \"GitHubId\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Users_Provider_ProviderId",
                table: "Users",
                columns: new[] { "Provider", "ProviderId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Users_Provider_ProviderId",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "Provider",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "ProviderId",
                table: "Users");

            migrationBuilder.AlterColumn<long>(
                name: "GitHubId",
                table: "Users",
                type: "bigint",
                nullable: false,
                defaultValue: 0L,
                oldClrType: typeof(long),
                oldType: "bigint",
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Users_GitHubId",
                table: "Users",
                column: "GitHubId",
                unique: true);
        }
    }
}
