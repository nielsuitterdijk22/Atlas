"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useApp } from "../../../components/AppContext";
import { ErrorState, Spinner } from "../../../components/ui";
import { timeAgo } from "../../../lib/format";
import {
  ApiError,
  fetchOrganization,
  inviteMember,
  removeMember,
  syncCatalog,
  updateMember,
  updateOrganization,
  type OrganizationDetail,
  type QuillProject,
} from "../../../lib/api";
import { fetchQuillProjectsAction, linkQuillCatalogAction } from "../../../lib/actions";

type ConnectMode = "quill" | "git" | null;

export default function OrgSettingsPage() {
  const { orgId, orgName, isPlatformEngineer, token: authToken } = useApp();
  const router = useRouter();

  const [org, setOrg] = useState<OrganizationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | Error | null>(null);
  const [repoUrl, setRepoUrl] = useState("");
  const [branch, setBranch] = useState("main");
  const [catalogToken, setCatalogToken] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [invite, setInvite] = useState({ username: "", role: "developer" });
  const [connectMode, setConnectMode] = useState<ConnectMode>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    fetchOrganization(orgId, { orgId, token: authToken })
      .then((o) => {
        setOrg(o);
        setRepoUrl(o.catalogRepoUrl || "");
        setBranch(o.catalogBranch || "main");
      })
      .catch(setError)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!isPlatformEngineer) router.replace("/");
  }, [isPlatformEngineer, router]);

  useEffect(() => {
    if (isPlatformEngineer) load();
  }, [orgId, isPlatformEngineer]);

  if (!isPlatformEngineer) return null;

  const act = async (key: string, fn: () => Promise<unknown>, successMsg?: string) => {
    setBusy(key);
    setNotice(null);
    setError(null);
    try {
      await fn();
      if (successMsg) setNotice(successMsg);
      load();
    } catch (err) {
      setError(err as Error);
    } finally {
      setBusy(null);
    }
  };

  const linkQuill = (body: Parameters<typeof linkQuillCatalogAction>[1]) =>
    act(
      "link-quill",
      async () => {
        const result = await linkQuillCatalogAction(orgId, body);
        if (result.error) throw new Error(result.error);
        setConnectMode(null);
      },
      "Quill project connected.",
    );

  const connectGit = () =>
    act(
      "save",
      async () => {
        const body: { catalogRepoUrl: string; catalogBranch: string; catalogRepoToken?: string } = {
          catalogRepoUrl: repoUrl,
          catalogBranch: branch || "main",
        };
        if (catalogToken) body.catalogRepoToken = catalogToken;
        await updateOrganization(orgId, body, { orgId, token: authToken });
        setCatalogToken("");
        setConnectMode(null);
      },
      "Catalog repository connected.",
    );

  return (
    <>
      <div className="top">
        <div>
          <div className="kicker">Governance</div>
          <h1>Organization settings</h1>
          <p className="desc">Manage {orgName || "your organization"}&apos;s catalog and members.</p>
        </div>
      </div>

      {loading && <Spinner />}
      {error && <ErrorState error={error} onRetry={load} />}
      {notice && <div className="notice">{notice}</div>}

      {!loading && org && (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div className="panel">
            <div className="panel-pad">
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Template catalog</div>

              {org.catalogRepoUrl ? (
                <>
                  <p className="hint" style={{ marginBottom: 16 }}>
                    Connect a Git repository holding your <code>form.yaml</code> templates. Atlas clones it on sync.
                    Last synced: <strong>{timeAgo(org.lastCatalogSyncAt)}</strong>.
                  </p>
                  <GitRepoFields
                    repoUrl={repoUrl}
                    setRepoUrl={setRepoUrl}
                    branch={branch}
                    setBranch={setBranch}
                    catalogToken={catalogToken}
                    setCatalogToken={setCatalogToken}
                    hasCatalogToken={org.hasCatalogToken}
                  />
                  <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                    <button disabled={busy != null} onClick={connectGit} className="btn">
                      Save
                    </button>
                    <button
                      disabled={busy != null}
                      onClick={() => act("sync", () => syncCatalog(orgId, { orgId, token: authToken }), "Catalog synced.")}
                      className="btn primary"
                    >
                      {busy === "sync" ? "Syncing…" : "Sync now"}
                    </button>
                  </div>
                </>
              ) : connectMode === null ? (
                <>
                  <p className="hint" style={{ marginBottom: 16 }}>
                    No git backend connected yet. Choose where to store your <code>form.yaml</code> catalog
                    templates.
                  </p>
                  <div className="cards" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
                    <button type="button" className="tpl-card card-btn" onClick={() => setConnectMode("quill")}>
                      <div className="tpl-card-body">
                        <div className="tpl-icon">📝</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h3 className="tpl-title">Connect with Quill</h3>
                          <p className="tpl-desc">Store templates in an existing or new Quill project.</p>
                        </div>
                      </div>
                    </button>
                    <button type="button" className="tpl-card card-btn" onClick={() => setConnectMode("git")}>
                      <div className="tpl-card-body">
                        <div className="tpl-icon">🌐</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h3 className="tpl-title">Connect a git repository</h3>
                          <p className="tpl-desc">Point at any GitHub, GitLab, or self-hosted repo URL.</p>
                        </div>
                      </div>
                    </button>
                  </div>
                </>
              ) : connectMode === "git" ? (
                <>
                  <button className="btn sm" disabled={busy != null} onClick={() => setConnectMode(null)} style={{ marginBottom: 14 }}>
                    ← Back
                  </button>
                  <GitRepoFields
                    repoUrl={repoUrl}
                    setRepoUrl={setRepoUrl}
                    branch={branch}
                    setBranch={setBranch}
                    catalogToken={catalogToken}
                    setCatalogToken={setCatalogToken}
                    hasCatalogToken={false}
                  />
                  <div style={{ marginTop: 12 }}>
                    <button disabled={busy != null || !repoUrl.trim()} onClick={connectGit} className="btn primary">
                      {busy === "save" ? "Connecting…" : "Connect"}
                    </button>
                  </div>
                </>
              ) : (
                <QuillConnectPanel disabled={busy != null} onBack={() => setConnectMode(null)} onLink={linkQuill} />
              )}
            </div>
          </div>

          <div className="panel">
            <div className="panel-pad">
              <div style={{ fontWeight: 600, marginBottom: 12 }}>Members</div>
              <div className="kv-list" style={{ marginBottom: 16 }}>
                {(org.members || []).map((m) => (
                  <div key={m.id} className="kv-row" style={{ alignItems: "center" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span className="v">{m.username}</span>
                      {m.status === "pending" && <span className="badge amber">invited</span>}
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <select
                        value={m.role}
                        onChange={(e) => act(`role-${m.id}`, () => updateMember(orgId, m.id, e.target.value, { orgId, token: authToken }))}
                        disabled={busy != null}
                        style={{ width: 180 }}
                      >
                        <option value="developer">Developer</option>
                        <option value="platform-engineer">Platform Engineer</option>
                      </select>
                      <button
                        disabled={busy != null}
                        onClick={() => act(`rm-${m.id}`, () => removeMember(orgId, m.id, { orgId, token: authToken }))}
                        className="btn danger sm"
                      >
                        Remove
                      </button>
                    </span>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  value={invite.username}
                  onChange={(e) => setInvite({ ...invite, username: e.target.value })}
                  placeholder="Username to invite"
                />
                <select value={invite.role} onChange={(e) => setInvite({ ...invite, role: e.target.value })} style={{ width: 180 }}>
                  <option value="developer">Developer</option>
                  <option value="platform-engineer">Platform Engineer</option>
                </select>
                <button
                  disabled={busy != null || !invite.username.trim()}
                  onClick={() =>
                    act("invite", () => inviteMember(orgId, invite.username.trim(), invite.role, { orgId, token: authToken }), `Invited ${invite.username.trim()}.`).then(
                      () => setInvite({ username: "", role: "developer" }),
                    )
                  }
                  className="btn primary"
                >
                  Invite
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function GitRepoFields({
  repoUrl,
  setRepoUrl,
  branch,
  setBranch,
  catalogToken,
  setCatalogToken,
  hasCatalogToken,
}: {
  repoUrl: string;
  setRepoUrl: (v: string) => void;
  branch: string;
  setBranch: (v: string) => void;
  catalogToken: string;
  setCatalogToken: (v: string) => void;
  hasCatalogToken: boolean;
}) {
  return (
    <>
      <div className="grid-2" style={{ gridTemplateColumns: "2fr 1fr" }}>
        <input
          value={repoUrl}
          onChange={(e) => setRepoUrl(e.target.value)}
          placeholder="https://github.com/org/templates.git"
        />
        <input value={branch} onChange={(e) => setBranch(e.target.value)} placeholder="main" />
      </div>
      <div style={{ marginTop: 12 }}>
        <label>Access token (for private repositories)</label>
        <input
          type="password"
          value={catalogToken}
          onChange={(e) => setCatalogToken(e.target.value)}
          placeholder={hasCatalogToken ? "•••••••• token set — type to replace" : "GitHub token with repo read access"}
        />
        <p className="hint">
          Stored encrypted; never shown again. Leave blank to keep the current token
          {hasCatalogToken ? "" : " (public repos need none)"}.
        </p>
      </div>
    </>
  );
}

function QuillConnectPanel({
  disabled,
  onBack,
  onLink,
}: {
  disabled: boolean;
  onBack: () => void;
  onLink: (body: Parameters<typeof linkQuillCatalogAction>[1]) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<QuillProject[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [creatingNew, setCreatingNew] = useState(false);
  const [selectedSlug, setSelectedSlug] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newName, setNewName] = useState("");

  useEffect(() => {
    fetchQuillProjectsAction().then((result) => {
      if (result.error) setLoadError(result.error);
      else setProjects(result.projects ?? []);
      setLoading(false);
    });
  }, []);

  return (
    <div>
      <button className="btn sm" disabled={disabled} onClick={onBack} style={{ marginBottom: 14 }}>
        ← Back
      </button>

      {loading && <p className="hint">Loading your Quill projects…</p>}
      {loadError && <p className="field err">{loadError}</p>}

      {!loading && !loadError && (
        <>
          {!creatingNew && projects.length > 0 && (
            <div className="field">
              <label>Attach to an existing Quill project</label>
              <select value={selectedSlug} onChange={(e) => setSelectedSlug(e.target.value)}>
                <option value="">Select a project…</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.slug}>
                    {p.name} ({p.slug})
                  </option>
                ))}
              </select>
            </div>
          )}

          {!creatingNew ? (
            <button className="btn" disabled={disabled} onClick={() => setCreatingNew(true)} style={{ marginBottom: 14 }}>
              + Create a new Quill project instead
            </button>
          ) : (
            <div style={{ marginBottom: 14 }}>
              <div className="field">
                <label htmlFor="new-quill-slug">New project slug</label>
                <input
                  id="new-quill-slug"
                  value={newSlug}
                  onChange={(e) => setNewSlug(e.target.value)}
                  placeholder="e.g. acme-platform"
                />
              </div>
              <div className="field">
                <label htmlFor="new-quill-name">New project name</label>
                <input
                  id="new-quill-name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Acme Platform"
                />
              </div>
              {projects.length > 0 && (
                <button className="btn" disabled={disabled} onClick={() => setCreatingNew(false)}>
                  ← Use an existing project instead
                </button>
              )}
            </div>
          )}

          {creatingNew ? (
            <button
              className="btn primary"
              disabled={disabled || !newSlug.trim() || !newName.trim()}
              onClick={() =>
                onLink({ mode: "new", quillProjectSlug: newSlug.trim(), quillProjectName: newName.trim(), repoSlug: "atlas-catalog" })
              }
            >
              Create project & connect
            </button>
          ) : (
            <button
              className="btn primary"
              disabled={disabled || !selectedSlug}
              onClick={() => onLink({ mode: "existing", quillProjectSlug: selectedSlug, repoSlug: "atlas-catalog" })}
            >
              Connect
            </button>
          )}
        </>
      )}
    </div>
  );
}
