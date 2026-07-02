// Typed API client for the Go backend.
//
// Auth is a Zitadel-issued bearer token (see lib/session.ts), not a cookie, so
// every call — server or client — attaches ctx.token explicitly. Client
// Components call relative paths, proxied to the backend by next.config.mjs's
// rewrite, so no CORS setup is needed on the backend; Server Components/Actions
// call it directly via ATLAS_API_BASE_URL.

const isServer = typeof window === "undefined";
const API_BASE = isServer ? process.env.ATLAS_API_BASE_URL || "http://localhost:8080" : "";

export class ApiError extends Error {
  status: number;
  detail?: string;
  constructor(message: string, status: number, detail?: string) {
    super(message);
    this.status = status;
    this.detail = detail;
  }
}

/** Per-call context: the active org (sent as X-Atlas-Org) and the caller's
 * Zitadel bearer token. */
export type Ctx = { orgId?: string; token?: string };

async function request<T>(path: string, ctx: Ctx = {}, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (ctx.orgId) headers.set("X-Atlas-Org", ctx.orgId);
  if (ctx.token) headers.set("Authorization", `Bearer ${ctx.token}`);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers,
      cache: "no-store",
    });
  } catch (err) {
    throw new ApiError(
      "Could not reach the API server. Is the backend running?",
      0,
      err instanceof Error ? err.message : String(err),
    );
  }

  if (!res.ok) {
    let detail = "";
    try {
      const body = await res.json();
      detail = body.error || body.message || JSON.stringify(body);
    } catch {
      detail = res.statusText;
    }
    throw new ApiError(`Request failed (${res.status})`, res.status, detail);
  }

  if (res.status === 204) return null as T;
  return res.json() as Promise<T>;
}

function jsonBody<T>(path: string, body: unknown, ctx: Ctx = {}, method = "POST"): Promise<T> {
  return request<T>(path, ctx, { method, body: JSON.stringify(body) });
}

// --- Types ---

export type User = {
  id: string;
  username: string;
  displayName: string;
  email: string | null;
};

export type Membership = {
  orgId: string;
  orgName: string;
  orgSlug: string;
  role: "developer" | "platform-engineer";
};

export type Me = { user: User; memberships: Membership[] };

export type Organization = {
  id: string;
  name: string;
  slug: string;
  role: "developer" | "platform-engineer";
};

export type OrgMember = {
  id: string;
  username: string;
  role: "developer" | "platform-engineer";
  status: "active" | "pending";
};

export type OrganizationDetail = {
  id: string;
  name: string;
  slug: string;
  catalogRepoUrl: string | null;
  catalogBranch: string;
  lastCatalogSyncAt: string | null;
  hasCatalogToken: boolean;
  role: "developer" | "platform-engineer";
  members: OrgMember[] | null;
};

export type TemplateInput = {
  id: string;
  title: string;
  type: "string" | "number" | "boolean" | "select" | "multiline";
  required: boolean;
  pattern?: string | null;
  description?: string | null;
  default?: unknown;
  options?: string[] | null;
  min?: number | null;
  max?: number | null;
};

export type TemplateDefinition = {
  apiVersion: string;
  kind: string;
  metadata: {
    name: string;
    title: string;
    description: string;
    icon: string;
    serviceType: string;
  };
  spec: {
    owner: string;
    inputs: TemplateInput[];
    output: { preset?: string | null; target: { type: string; repo: string; branch: string; path: string; commitMessage: string }; github?: { tokenEnv: string } | null; template: string };
    approvalRequired: boolean;
    nameInput?: string | null;
  };
};

export type Service = {
  id: string;
  orgId: string;
  name: string;
  templateName: string;
  serviceType: string;
  team: string;
  owner: string;
  lifecycle: string;
  description: string | null;
  repoUrl: string | null;
  createdAt: string;
  requestId: string;
};

export type ServiceListResponse = { items: Service[]; total: number; page: number; pageSize: number };

export type RequestStatus =
  | "pending-approval"
  | "provisioning"
  | "completed"
  | "failed"
  | "rejected";

export type ProvisioningRequest = {
  id: string;
  orgId: string;
  templateName: string;
  templateTitle: string;
  name: string;
  team: string;
  owner: string;
  status: RequestStatus;
  requiresApproval: boolean;
  valuesJson: string | null;
  submittedBy: string;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  completedAt: string | null;
  errorMessage: string | null;
  commitSha: string | null;
  commitUrl: string | null;
  executionLogId: string | null;
};

export type ExecutionLog = {
  id: string;
  orgId: string;
  templateName: string;
  templateTitle: string;
  status: string;
  commitSha: string | null;
  commitUrl: string | null;
  errorMessage: string | null;
  valuesJson: string | null;
  filesCreated: string[];
  outputTarget: string | null;
  outputRepo: string | null;
  executedAt: string;
  durationMs: number;
};

export type ExecutionListResponse = { items: ExecutionLog[]; total: number; page: number; pageSize: number };

export type OutputPreset = {
  id: string;
  orgId: string;
  name: string;
  description: string | null;
  type: "local" | "github";
  repo: string;
  branch: string;
  path: string;
  commitMessageTemplate: string | null;
  gitHubTokenEnv: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ExecuteResult = {
  success: boolean;
  message: string;
  commitSha: string | null;
  commitUrl: string | null;
  filesCreated: string[];
};

// --- Auth ---

export function fetchMe(ctx: Ctx = {}): Promise<Me> {
  return request<Me>("/api/me", ctx);
}

// --- Organizations ---

export function fetchOrganizations(ctx: Ctx = {}): Promise<Organization[]> {
  return request("/api/orgs", ctx);
}

export function fetchOrganization(id: string, ctx: Ctx = {}): Promise<OrganizationDetail> {
  return request(`/api/orgs/${id}`, ctx);
}

export function createOrganization(name: string, ctx: Ctx = {}): Promise<OrganizationDetail> {
  return jsonBody("/api/orgs", { name }, ctx);
}

export function updateOrganization(
  id: string,
  body: { name?: string; catalogRepoUrl?: string; catalogBranch?: string; catalogRepoToken?: string },
  ctx: Ctx = {},
): Promise<OrganizationDetail> {
  return jsonBody(`/api/orgs/${id}`, body, ctx, "PUT");
}

export function inviteMember(orgId: string, username: string, role: string, ctx: Ctx = {}): Promise<OrgMember> {
  return jsonBody(`/api/orgs/${orgId}/members`, { username, role }, ctx);
}

export function updateMember(orgId: string, membershipId: string, role: string, ctx: Ctx = {}): Promise<OrgMember> {
  return jsonBody(`/api/orgs/${orgId}/members/${membershipId}`, { role }, ctx, "PUT");
}

export function removeMember(orgId: string, membershipId: string, ctx: Ctx = {}): Promise<null> {
  return request(`/api/orgs/${orgId}/members/${membershipId}`, ctx, { method: "DELETE" });
}

// --- Quill integration ---

export type QuillProject = {
  id: string;
  slug: string;
  name: string;
  description: string;
  isPersonal: boolean;
  role?: string;
};

export function listQuillProjects(ctx: Ctx = {}): Promise<QuillProject[]> {
  return request("/api/quill/projects", ctx);
}

export type LinkQuillCatalogBody = {
  mode: "personal" | "existing" | "new";
  quillProjectSlug?: string;
  quillProjectName?: string;
  repoSlug?: string;
};

export function linkQuillCatalog(orgId: string, body: LinkQuillCatalogBody, ctx: Ctx = {}): Promise<OrganizationDetail> {
  return jsonBody(`/api/orgs/${orgId}/catalog/link-quill`, body, ctx);
}

export function syncCatalog(
  orgId: string,
  ctx: Ctx = {},
): Promise<{ templateCount: number; lastCatalogSyncAt: string }> {
  return jsonBody(`/api/orgs/${orgId}/catalog/sync`, {}, ctx);
}

// --- Templates ---

export function fetchTemplates(ctx: Ctx = {}): Promise<TemplateDefinition[]> {
  return request("/api/templates", ctx);
}

export function fetchTemplate(name: string, ctx: Ctx = {}): Promise<TemplateDefinition> {
  return request(`/api/templates/${encodeURIComponent(name)}`, ctx);
}

// --- Services (catalog) ---

export function fetchServices(
  filters: { search?: string; team?: string; page?: number; pageSize?: number } = {},
  ctx: Ctx = {},
): Promise<ServiceListResponse> {
  const params = new URLSearchParams(
    Object.entries(filters).filter(([, v]) => v !== undefined && v !== "") as [string, string][],
  );
  const qs = params.toString();
  return request(`/api/services${qs ? `?${qs}` : ""}`, ctx);
}

export function fetchService(id: string, ctx: Ctx = {}): Promise<Service> {
  return request(`/api/services/${id}`, ctx);
}

// --- Requests ---

export function fetchRequests(filters: { status?: string } = {}, ctx: Ctx = {}): Promise<ProvisioningRequest[]> {
  const params = new URLSearchParams(
    Object.entries(filters).filter(([, v]) => v) as [string, string][],
  );
  const qs = params.toString();
  return request(`/api/requests${qs ? `?${qs}` : ""}`, ctx);
}

export function fetchRequest(id: string, ctx: Ctx = {}): Promise<ProvisioningRequest> {
  return request(`/api/requests/${id}`, ctx);
}

export function createRequest(
  body: { templateName: string; name: string; team: string; owner: string; values: Record<string, unknown> },
  ctx: Ctx = {},
): Promise<ProvisioningRequest> {
  return jsonBody("/api/requests", body, ctx);
}

export function retryRequest(id: string, ctx: Ctx = {}): Promise<ProvisioningRequest> {
  return jsonBody(`/api/requests/${id}/retry`, {}, ctx);
}

export function approveRequest(id: string, reason?: string, ctx: Ctx = {}): Promise<ProvisioningRequest> {
  return jsonBody(`/api/requests/${id}/approve`, { reason }, ctx);
}

export function rejectRequest(id: string, reason: string, ctx: Ctx = {}): Promise<ProvisioningRequest> {
  return jsonBody(`/api/requests/${id}/reject`, { reason }, ctx);
}

// --- Admin ---

export function fetchExecutions(
  page = 1,
  pageSize = 20,
  filters: { template?: string; status?: string } = {},
  ctx: Ctx = {},
): Promise<ExecutionListResponse> {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
    ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)),
  });
  return request(`/api/admin/executions?${params}`, ctx);
}

export function fetchExecution(id: string, ctx: Ctx = {}): Promise<ExecutionLog> {
  return request(`/api/admin/executions/${id}`, ctx);
}

export function fetchPresets(ctx: Ctx = {}): Promise<OutputPreset[]> {
  return request("/api/admin/presets", ctx);
}

export function createPreset(preset: Partial<OutputPreset>, ctx: Ctx = {}): Promise<OutputPreset> {
  return jsonBody("/api/admin/presets", preset, ctx);
}

export function updatePreset(id: string, preset: Partial<OutputPreset>, ctx: Ctx = {}): Promise<OutputPreset> {
  return jsonBody(`/api/admin/presets/${id}`, preset, ctx, "PUT");
}

export function deletePreset(id: string, ctx: Ctx = {}): Promise<null> {
  return request(`/api/admin/presets/${id}`, ctx, { method: "DELETE" });
}
