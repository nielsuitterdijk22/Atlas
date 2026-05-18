using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using Yaly.Api.Data;
using Yaly.Api.Services;

// Load .env file from repo root if it exists
var envFile = Path.Combine(Directory.GetCurrentDirectory(), "..", ".env");
if (File.Exists(envFile))
{
    foreach (var line in File.ReadAllLines(envFile))
    {
        var trimmed = line.Trim();
        if (string.IsNullOrEmpty(trimmed) || trimmed.StartsWith('#')) continue;
        var eqIndex = trimmed.IndexOf('=');
        if (eqIndex <= 0) continue;
        var key = trimmed[..eqIndex].Trim();
        var value = trimmed[(eqIndex + 1)..].Trim().Trim('"').Trim('\'');
        Environment.SetEnvironmentVariable(key, value);
    }
}

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
    });

builder.Services.AddDbContext<YalyDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));
builder.Services.AddHttpContextAccessor();
builder.Services.AddDataProtection()
    .PersistKeysToFileSystem(new DirectoryInfo(
        Path.Combine(Directory.GetCurrentDirectory(), "data-protection-keys")));
builder.Services.AddSingleton<SecretProtector>();
builder.Services.AddSingleton<CatalogService>();
builder.Services.AddSingleton<TemplateRenderer>();
builder.Services.AddSingleton<GitLocalService>();
builder.Services.AddSingleton<GitHubService>();
builder.Services.AddScoped<ProvisioningService>();
builder.Services.AddScoped<CatalogSyncService>();
builder.Services.AddScoped<IUserContext, UserContext>();

var frontendUrl = builder.Configuration["Frontend:Url"] ?? "http://localhost:5173";

builder.Services.AddAuthentication(options =>
    {
        options.DefaultScheme = CookieAuthenticationDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme = "GitHub";
    })
    .AddCookie(options =>
    {
        options.Cookie.Name = "yaly.session";
        options.Cookie.HttpOnly = true;
        options.Cookie.SameSite = SameSiteMode.Lax;
        options.Cookie.SecurePolicy = CookieSecurePolicy.SameAsRequest;
        options.ExpireTimeSpan = TimeSpan.FromDays(7);
        options.SlidingExpiration = true;
        // API clients want status codes, not redirects to a login page.
        options.Events.OnRedirectToLogin = ctx => { ctx.Response.StatusCode = 401; return Task.CompletedTask; };
        options.Events.OnRedirectToAccessDenied = ctx => { ctx.Response.StatusCode = 403; return Task.CompletedTask; };
    })
    .AddGitHub("GitHub", options =>
    {
        options.ClientId = Environment.GetEnvironmentVariable("GITHUB_OAUTH_CLIENT_ID") ?? "";
        options.ClientSecret = Environment.GetEnvironmentVariable("GITHUB_OAUTH_CLIENT_SECRET") ?? "";
        options.CallbackPath = "/signin-github";
        options.Scope.Add("read:user");
        // No "user:email" scope: the /user/emails fetch fails for GitHub-App tokens
        // without the email permission. Email is optional — identity is the GitHub id.
        options.Events.OnCreatingTicket = GitHubLoginHandler.OnCreatingTicket;
        options.Events.OnRemoteFailure = ctx =>
        {
            var reason = Uri.EscapeDataString(ctx.Failure?.Message ?? "GitHub sign-in failed");
            ctx.Response.Redirect($"{frontendUrl}?authError={reason}");
            ctx.HandleResponse();
            return Task.CompletedTask;
        };
    });

builder.Services.AddAuthorization(options =>
{
    // Every endpoint requires a signed-in user unless it opts out with [AllowAnonymous].
    // Challenge the cookie scheme so unauthenticated API calls get 401, not an OAuth redirect.
    options.FallbackPolicy = new Microsoft.AspNetCore.Authorization.AuthorizationPolicyBuilder()
        .AddAuthenticationSchemes(CookieAuthenticationDefaults.AuthenticationScheme)
        .RequireAuthenticatedUser()
        .Build();
});

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins(frontendUrl)
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
    });
});

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<YalyDbContext>();
    db.Database.Migrate();
}

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();
