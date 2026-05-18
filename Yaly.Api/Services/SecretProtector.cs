using Microsoft.AspNetCore.DataProtection;

namespace Yaly.Api.Services;

/// <summary>Encrypts/decrypts small secrets (catalog repo tokens) with ASP.NET Data Protection.</summary>
public class SecretProtector
{
    private readonly IDataProtector _protector;

    public SecretProtector(IDataProtectionProvider provider)
    {
        _protector = provider.CreateProtector("Yaly.CatalogRepoToken.v1");
    }

    public string Protect(string plaintext) => _protector.Protect(plaintext);

    /// <summary>Decrypts a stored secret; returns null if it cannot be decrypted.</summary>
    public string? TryUnprotect(string? cipher)
    {
        if (string.IsNullOrEmpty(cipher)) return null;
        try
        {
            return _protector.Unprotect(cipher);
        }
        catch
        {
            return null;
        }
    }
}
