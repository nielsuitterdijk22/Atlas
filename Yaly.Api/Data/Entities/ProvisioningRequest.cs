namespace Yaly.Api.Data.Entities;

public class ProvisioningRequest
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid OrgId { get; set; }
    public string TemplateName { get; set; } = "";
    public string TemplateTitle { get; set; } = "";

    /// <summary>The service name the request will produce.</summary>
    public string Name { get; set; } = "";
    public string Team { get; set; } = "";
    public string Owner { get; set; } = "";

    /// <summary>pending-approval | provisioning | completed | failed | rejected</summary>
    public string Status { get; set; } = "pending-approval";

    public bool RequiresApproval { get; set; }

    /// <summary>JSON of the resolved template values submitted with the request.</summary>
    public string? ValuesJson { get; set; }

    public string SubmittedBy { get; set; } = "";
    public string? ApprovedBy { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public string? RejectionReason { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? CompletedAt { get; set; }
    public string? ErrorMessage { get; set; }

    public string? CommitSha { get; set; }
    public string? CommitUrl { get; set; }
    public Guid? ExecutionLogId { get; set; }
}
