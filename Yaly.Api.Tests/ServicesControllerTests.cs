using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Configuration;
using Xunit;
using Xunit.SkipTraits;
using Yaly.Api.Data;
using Yaly.Api.Data.Entities;
using Yaly.Api.Services;

namespace Yaly.Api.Tests;

/// <summary>
/// Boots the real API (Program.cs) against the throwaway test database and
/// authenticates by stamping the session cookie with a <c>yaly:uid</c> claim —
/// the same claim the IdP login handlers produce — then exercises the
/// <c>X-Yaly-Org</c> active-org resolution exactly as the SPA does.
/// </summary>
public class ServicesControllerTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _factory;

    public ServicesControllerTests(ApiFactory factory)
    {
        _factory = factory;
    }

    private static string? TestDatabaseUrl =>
        Environment.GetEnvironmentVariable("ATLAS_TEST_DATABASE_URL")
        ?? Environment.GetEnvironmentVariable("TEST_DATABASE_URL");

    [Fact]
    [Skip.If(TestDatabaseUrl == null, "ATLAS_TEST_DATABASE_URL / TEST_DATABASE_URL not set")]
    public async Task TestTenantIsolationRead()
    {
        var (clientA, orgA, _, orgBServiceId) = await SeedTwoOrgsAsync(_factory);
        var ownServiceId = (Guid)clientA.GetCookieValue("$ownServiceId")!;

        // The user belongs to Org A only; they request a service that exists
        // in Org B. The tenant boundary must make it invisible: 404, not 200.
        var crossTenant = await clientA.GetAsync($"/api/services/{orgBServiceId}");
        Assert.Equal(System.Net.HttpStatusCode.NotFound, crossTenant.StatusCode);

        // Sanity: the same user can read their own org's service.
        var own = await clientA.GetAsync($"/api/services/{ownServiceId}");
        Assert.Equal(System.Net.HttpStatusCode.OK, own.StatusCode);
    }

    [Fact]
    [Skip.If(TestDatabaseUrl == null, "ATLAS_TEST_DATABASE_URL / TEST_DATABASE_URL not set")]
    public async Task Get_ReturnsNotFound_ForUnknownServiceId()
    {
        var (clientA, _, _, _) = await SeedTwoOrgsAsync(_factory);

        var response = await clientA.GetAsync($"/api/services/{Guid.NewGuid()}");
        Assert.Equal(System.Net.HttpStatusCode.NotFound, response.StatusCode);
    }

    /// <summary>
    /// Seeds two organizations with one service each and a user who is an active
    /// member of Org A only. Returns an authenticated client for that user (with
    /// the Org A active-org header set), both orgs, the user, and Org B's service id.
    /// </summary>
    private static async Task<(HttpClient clientA, Organization orgA, User user, Guid orgBServiceId)>
        SeedTwoOrgsAsync(ApiFactory factory)
    {
        var db = factory.CreateScope().ServiceProvider.GetRequiredService<YalyDbContext>();
        db.Database.Migrate();

        var user = new User
        {
            Provider = "zitadel",
            ProviderId = $"iso-{Guid.NewGuid():N}",
            GitHubLogin = $"iso-{Guid.NewGuid():N}",
            DisplayName = "Isolation Tester",
        };
        db.Users.Add(user);

        var orgA = new Organization
        {
            Name = $"Org A {Guid.NewGuid():N}",
            Slug = $"org-a-{Guid.NewGuid():N}",
            CreatedByUserId = user.Id,
        };
        var orgB = new Organization
        {
            Name = $"Org B {Guid.NewGuid():N}",
            Slug = $"org-b-{Guid.NewGuid():N}",
            CreatedByUserId = user.Id,
        };
        db.Organizations.AddRange(orgA, orgB);

        db.Memberships.Add(new Membership
        {
            OrgId = orgA.Id,
            UserId = user.Id,
            GitHubLogin = user.GitHubLogin,
            Role = "developer",
            Status = "active",
        });

        var serviceA = new Service
        {
            OrgId = orgA.Id,
            Name = "service-a",
            TemplateName = "microservice",
            Owner = user.GitHubLogin,
        };
        var serviceB = new Service
        {
            OrgId = orgB.Id,
            Name = "service-b",
            TemplateName = "microservice",
            Owner = "someone-else",
        };
        db.Services.AddRange(serviceA, serviceB);

        // A fresh session row so the inactivity middleware does not 401 the calls.
        db.Sessions.Add(new Session
        {
            UserId = user.Id,
            CreatedAt = DateTime.UtcNow,
            LastActivityAt = DateTime.UtcNow,
        });

        await db.SaveChangesAsync();

        var client = factory.CreateClient();
        await client.AddTestAuthCookieAsync(user.Id);
        client.DefaultRequestHeaders.Add("X-Yaly-Org", orgA.Id.ToString());
        client.SetCookieValue("$ownServiceId", serviceA.Id.ToString());

        return (client, orgA, user, serviceB.Id);
    }
}

/// <summary>
/// Hosts the real API once per test class. The database connection is pointed
/// at the throwaway test database (migrations applied on startup, as in
/// Program.cs) and the IdP environment is left unconfigured so the cookie
/// scheme is the default — the tests authenticate directly with the
/// <c>yaly:uid</c> claim, bypassing the OAuth round-trip.
/// </summary>
public class ApiFactory : WebApplicationFactory<Program>
{
    protected override IHost CreateHost(IHostBuilder builder)
    {
        builder.UseEnvironment("Development");
        builder.UseContentRoot(AppContext.BaseDirectory.Replace("Yaly.Api.Tests", "Yaly.Api", StringComparison.Ordinal));
        builder.ConfigureAppConfiguration((_, config) =>
        {
            var url = Environment.GetEnvironmentVariable("ATLAS_TEST_DATABASE_URL")
                ?? Environment.GetEnvironmentVariable("TEST_DATABASE_URL")
                ?? "Host=localhost;Port=5432;Database=yaly;Username=yaly;Password=yaly_dev";
            config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings__DefaultConnection"] = url,
            });
        });
        return base.CreateHost(builder);
    }
}

public static class TestAuthExtensions
{
    /// <summary>
    /// Stamps the API's session cookie with a <c>yaly:uid</c> claim, the same
    /// claim the Zitadel/GitHub login handlers add on sign-in.
    /// </summary>
    public static async Task AddTestAuthCookieAsync(this HttpClient client, Guid userId)
    {
        var handler = (TestHttpMessageHandler)client!;
        var options = handler.Services
            .GetRequiredService<IOptions<CookieAuthenticationOptions>>().Value;

        var identity = new ClaimsIdentity(options.Scheme, options.Cookie.Name, options.Cookie.Name)
        {
            new Claim(YalyClaims.UserId, userId.ToString()),
        };
        var ticket = new AuthenticationTicket(identity, new AuthenticationProperties());

        var dataProtection = new DataProtectionProvider(
            new EphemeralDataProtectionProvider(handler.Services.GetRequiredService<IServiceProvider>()));
        var logger = handler.Services.GetRequiredService<ILogger<CookieAuthenticationHandler>>();

        var serialized = await new CookieAuthenticationHandler(
            new AuthenticationSchemeParts(options.Scheme),
            Options.Create(options),
            dataProtection,
            new[] { logger },
            System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping
        ).SerializeUserAsync(ticket);

        handler.AddTestAuthCookies(new[] { serialized });
    }

    public static void SetCookieValue(this HttpClient client, string key, string value)
    {
        ((TestHttpMessageHandler)client!).Cookies[key] = value;
    }

    public static string? GetCookieValue(this HttpClient client, string key)
    {
        return ((TestHttpMessageHandler)client!).Cookies.TryGetValue(key, out var value) ? value : null;
    }
}
