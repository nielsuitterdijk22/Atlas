using Microsoft.EntityFrameworkCore;
using Yaly.Api.Data;
using Yaly.Api.Data.Entities;

namespace Yaly.Api.Services;

public interface ISessionService
{
    /// <summary>
    /// Records activity for the user's session (creating it on first sight) and
    /// returns the session. An expired or invalidated session has
    /// <see cref="SessionInfo.IsExpired"/> set; callers must sign the user out.
    /// </summary>
    Task<SessionInfo> TouchAsync(Guid userId);

    /// <summary>Explicitly ends the user's session (logout).</summary>
    Task InvalidateAsync(Guid userId);
}

public class SessionInfo
{
    public required Guid Id { get; init; }
    public required DateTime LastActivityAt { get; init; }

    /// <summary>True when the session must no longer be honored (inactivity timeout or invalidation).</summary>
    public required bool IsExpired { get; init; }

    /// <summary>Seconds until the session expires from the last activity; null when already expired.</summary>
    public int? ExpiresInSeconds { get; init; }
}

/// <summary>
/// Server-side session tracking: one row per user, last-activity timestamp
/// refreshed on every authenticated request, plus explicit invalidation on
/// logout. Inactivity timeout defaults to 30 minutes (US-009) and is
/// configurable via SESSION_INACTIVITY_TIMEOUT_MINUTES.
/// </summary>
public class SessionService : ISessionService
{
    private readonly YalyDbContext _db;
    private readonly TimeSpan _timeout;

    public SessionService(YalyDbContext db, IConfiguration config)
    {
        _db = db;
        var minutes = config.GetValue<int?>("Session:InactivityTimeoutMinutes")
            ?? config.GetValue<int?>("SESSION_INACTIVITY_TIMEOUT_MINUTES")
            ?? 30;
        _timeout = TimeSpan.FromMinutes(Math.Max(1, minutes));
    }

    public async Task<SessionInfo> TouchAsync(Guid userId)
    {
        var now = DateTime.UtcNow;
        var session = await _db.Sessions.FirstOrDefaultAsync(s => s.UserId == userId);

        // An invalidated session must never be resurrected by a touch.
        if (session?.InvalidatedAt != null)
        {
            return new SessionInfo
            {
                Id = session.Id,
                LastActivityAt = session.LastActivityAt,
                IsExpired = true,
                ExpiresInSeconds = null,
            };
        }

        if (session == null)
        {
            session = new Session { UserId = userId, CreatedAt = now, LastActivityAt = now };
            _db.Sessions.Add(session);
        }
        else
        {
            session.LastActivityAt = now;
        }

        await _db.SaveChangesAsync();

        var isExpired = now - session.LastActivityAt > _timeout;
        var remaining = isExpired ? null : (int)Math.Max(0, (_timeout - (now - session.LastActivityAt)).TotalSeconds);

        return new SessionInfo
        {
            Id = session.Id,
            LastActivityAt = session.LastActivityAt,
            IsExpired = isExpired,
            ExpiresInSeconds = remaining,
        };
    }

    public async Task InvalidateAsync(Guid userId)
    {
        var session = await _db.Sessions.FirstOrDefaultAsync(s => s.UserId == userId);
        if (session == null || session.InvalidatedAt != null)
            return;

        session.InvalidatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
    }
}
