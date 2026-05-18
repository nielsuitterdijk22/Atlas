using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Yaly.Api.Migrations
{
    /// <inheritdoc />
    public partial class CatalogRepoToken : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CatalogRepoTokenEncrypted",
                table: "Organizations",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CatalogRepoTokenEncrypted",
                table: "Organizations");
        }
    }
}
