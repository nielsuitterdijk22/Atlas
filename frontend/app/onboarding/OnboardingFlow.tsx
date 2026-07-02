"use client";

import { useEffect, useState, useTransition } from "react";

import type { QuillProject } from "../lib/api";
import {
  fetchQuillProjectsAction,
  finishOnboardingAction,
  linkQuillCatalogAction,
  startPersonalOnboarding,
  startTeamOnboarding,
} from "../lib/actions";

type Step = "choice" | "team-name" | "catalog";
type Mode = "personal" | "team";

export default function OnboardingFlow({ displayName }: { displayName: string }) {
  const [step, setStep] = useState<Step>("choice");
  const [mode, setMode] = useState<Mode>("personal");
  const [orgId, setOrgId] = useState<string | null>(null);
  const [orgName, setOrgName] = useState<string | null>(null);
  const [teamName, setTeamName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const choosePersonal = () => {
    setError(null);
    startTransition(async () => {
      const result = await startPersonalOnboarding(displayName);
      if (result.error) return setError(result.error);
      setMode("personal");
      setOrgId(result.orgId!);
      setOrgName(result.orgName!);
      setStep("catalog");
    });
  };

  const submitTeamName = () => {
    setError(null);
    startTransition(async () => {
      const result = await startTeamOnboarding(teamName);
      if (result.error) return setError(result.error);
      setMode("team");
      setOrgId(result.orgId!);
      setOrgName(result.orgName!);
      setStep("catalog");
    });
  };

  if (step === "choice") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 20 }}>
        <button className="btn primary" style={{ justifyContent: "center" }} disabled={pending} onClick={choosePersonal}>
          {pending ? "Setting up…" : "Just for me"}
        </button>
        <button className="btn" style={{ justifyContent: "center" }} disabled={pending} onClick={() => setStep("team-name")}>
          For my team
        </button>
        {error && <p className="field err">{error}</p>}
      </div>
    );
  }

  if (step === "team-name") {
    return (
      <div style={{ marginTop: 20 }}>
        <label htmlFor="team-name">Organization name</label>
        <input
          id="team-name"
          value={teamName}
          onChange={(e) => setTeamName(e.target.value)}
          placeholder="e.g. Acme Platform Team"
          autoFocus
        />
        {error && <p className="field err">{error}</p>}
        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <button className="btn" onClick={() => setStep("choice")} disabled={pending}>
            ← Back
          </button>
          <button className="btn primary" style={{ flex: 1, justifyContent: "center" }} onClick={submitTeamName} disabled={pending || !teamName.trim()}>
            {pending ? "Creating…" : "Continue"}
          </button>
        </div>
      </div>
    );
  }

  // step === "catalog"
  return <CatalogStep orgId={orgId!} orgName={orgName!} mode={mode} />;
}

function CatalogStep({ orgId, orgName, mode }: { orgId: string; orgName: string; mode: Mode }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const skip = () => startTransition(finishOnboardingAction);

  const linkAndFinish = (body: Parameters<typeof linkQuillCatalogAction>[1]) => {
    setBusy(true);
    setError(null);
    startTransition(async () => {
      const result = await linkQuillCatalogAction(orgId, body);
      if (result.error) {
        setError(result.error);
        setBusy(false);
        return;
      }
      await finishOnboardingAction();
    });
  };

  return (
    <div style={{ marginTop: 20 }}>
      <p style={{ marginTop: 0 }}>
        <strong>{orgName}</strong> is ready. Optionally connect it to a Quill project so its catalog forms and
        submitted answers are stored in git there — you can also do this later from org settings.
      </p>
      {error && <p className="field err">{error}</p>}
      {mode === "personal" ? (
        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <button className="btn" onClick={skip} disabled={busy}>
            Skip for now
          </button>
          <button
            className="btn primary"
            style={{ flex: 1, justifyContent: "center" }}
            disabled={busy}
            onClick={() => linkAndFinish({ mode: "personal", repoSlug: "yaly-catalog" })}
          >
            {busy ? "Setting up…" : "Set up in my Quill personal project"}
          </button>
        </div>
      ) : (
        <TeamCatalogPicker busy={busy} onSkip={skip} onLink={linkAndFinish} />
      )}
    </div>
  );
}

function TeamCatalogPicker({
  busy,
  onSkip,
  onLink,
}: {
  busy: boolean;
  onSkip: () => void;
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

  if (loading) return <p className="hint">Loading your Quill projects…</p>;
  if (loadError) {
    return (
      <div>
        <p className="field err">{loadError}</p>
        <button className="btn" onClick={onSkip} disabled={busy}>
          Skip for now
        </button>
      </div>
    );
  }

  return (
    <div>
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
        <button className="btn" onClick={() => setCreatingNew(true)} disabled={busy} style={{ marginBottom: 14 }}>
          + Create a new Quill project instead
        </button>
      ) : (
        <div style={{ marginBottom: 14 }}>
          <div className="field">
            <label htmlFor="new-slug">New project slug</label>
            <input id="new-slug" value={newSlug} onChange={(e) => setNewSlug(e.target.value)} placeholder="e.g. acme-platform" />
          </div>
          <div className="field">
            <label htmlFor="new-name">New project name</label>
            <input id="new-name" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Acme Platform" />
          </div>
          <button className="btn" onClick={() => setCreatingNew(false)} disabled={busy}>
            ← Use an existing project instead
          </button>
        </div>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn" onClick={onSkip} disabled={busy}>
          Skip for now
        </button>
        {creatingNew ? (
          <button
            className="btn primary"
            style={{ flex: 1, justifyContent: "center" }}
            disabled={busy || !newSlug.trim() || !newName.trim()}
            onClick={() => onLink({ mode: "new", quillProjectSlug: newSlug.trim(), quillProjectName: newName.trim(), repoSlug: "yaly-catalog" })}
          >
            {busy ? "Setting up…" : "Create project & connect"}
          </button>
        ) : (
          <button
            className="btn primary"
            style={{ flex: 1, justifyContent: "center" }}
            disabled={busy || !selectedSlug}
            onClick={() => onLink({ mode: "existing", quillProjectSlug: selectedSlug, repoSlug: "yaly-catalog" })}
          >
            {busy ? "Connecting…" : "Connect"}
          </button>
        )}
      </div>
    </div>
  );
}
