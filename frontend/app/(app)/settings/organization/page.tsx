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
} from "../../../lib/api";

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
              <p className="hint" style={{ marginBottom: 16 }}>
                Connect a Git repository holding your <code>form.yaml</code> templates. Yaly clones it on sync. Last
                synced: <strong>{timeAgo(org.lastCatalogSyncAt)}</strong>.
              </p>
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
                  placeholder={org.hasCatalogToken ? "•••••••• token set — type to replace" : "GitHub token with repo read access"}
                />
                <p className="hint">
                  Stored encrypted; never shown again. Leave blank to keep the current token
                  {org.hasCatalogToken ? "" : " (public repos need none)"}.
                </p>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button
                  disabled={busy != null}
                  onClick={() =>
                    act(
                      "save",
                      async () => {
                        const body: { catalogRepoUrl: string; catalogBranch: string; catalogRepoToken?: string } = {
                          catalogRepoUrl: repoUrl,
                          catalogBranch: branch,
                        };
                        if (catalogToken) body.catalogRepoToken = catalogToken;
                        await updateOrganization(orgId, body, { orgId, token: authToken });
                        setCatalogToken("");
                      },
                      "Catalog repository saved.",
                    )
                  }
                  className="btn"
                >
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
