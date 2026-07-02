"use client";

import { useEffect, useState } from "react";

import { useApp } from "../../../components/AppContext";
import { ApiError, createPreset, deletePreset, fetchPresets, updatePreset, type OutputPreset } from "../../../lib/api";

const emptyPreset: Partial<OutputPreset> = {
  name: "",
  description: "",
  type: "local",
  repo: "",
  branch: "main",
  path: "/",
  commitMessageTemplate: "",
  gitHubTokenEnv: "GITHUB_TOKEN",
};

export default function PresetsPage() {
  const { orgId, token } = useApp();
  const [presets, setPresets] = useState<OutputPreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | Error | null>(null);
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [form, setForm] = useState<Partial<OutputPreset>>({ ...emptyPreset });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    fetchPresets({ orgId, token }).then(setPresets).catch(setError).finally(() => setLoading(false));
  };

  useEffect(load, [orgId]);

  const startCreate = () => {
    setForm({ ...emptyPreset });
    setEditing("new");
    setFormError(null);
  };

  const startEdit = (preset: OutputPreset) => {
    setForm({ ...preset });
    setEditing(preset.id);
    setFormError(null);
  };

  const cancel = () => {
    setEditing(null);
    setFormError(null);
  };

  const handleSave = async () => {
    if (!form.name?.trim() || !form.repo?.trim()) {
      setFormError("Name and Repo are required");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      if (editing === "new") {
        await createPreset(form, { orgId, token });
      } else if (editing) {
        await updatePreset(editing, form, { orgId, token });
      }
      setEditing(null);
      load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save preset");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this preset?")) return;
    try {
      await deletePreset(id, { orgId, token });
      load();
    } catch (err) {
      setError(err as Error);
    }
  };

  const updateField = <K extends keyof OutputPreset>(field: K, value: OutputPreset[K]) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  if (editing !== null) {
    return (
      <div>
        <button onClick={cancel} className="btn" style={{ marginBottom: 20 }}>
          ← Back to presets
        </button>

        <div style={{ maxWidth: 480 }}>
          <h1 style={{ fontSize: 20, marginBottom: 20 }}>{editing === "new" ? "Create Output Preset" : "Edit Output Preset"}</h1>

          {formError && <div className="banner error">{formError}</div>}

          <div className="panel">
            <div className="panel-pad" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div className="field">
                <label>Name</label>
                <input type="text" value={form.name || ""} onChange={(e) => updateField("name", e.target.value)} placeholder="e.g. production-repo" />
              </div>

              <div className="field">
                <label>Description</label>
                <input type="text" value={form.description || ""} onChange={(e) => updateField("description", e.target.value)} placeholder="Optional description" />
              </div>

              <div className="field">
                <label>Type</label>
                <select value={form.type} onChange={(e) => updateField("type", e.target.value as OutputPreset["type"])}>
                  <option value="local">Local Git</option>
                  <option value="github">GitHub API</option>
                </select>
              </div>

              <div className="field">
                <label>Repository</label>
                <input
                  type="text"
                  value={form.repo || ""}
                  onChange={(e) => updateField("repo", e.target.value)}
                  placeholder={form.type === "github" ? "owner/repo-name" : "/path/to/repo"}
                />
              </div>

              <div className="grid-2">
                <div className="field">
                  <label>Branch</label>
                  <input type="text" value={form.branch || ""} onChange={(e) => updateField("branch", e.target.value)} />
                </div>
                <div className="field">
                  <label>Path</label>
                  <input type="text" value={form.path || ""} onChange={(e) => updateField("path", e.target.value)} />
                </div>
              </div>

              <div className="field">
                <label>Commit Message Template</label>
                <input
                  type="text"
                  value={form.commitMessageTemplate || ""}
                  onChange={(e) => updateField("commitMessageTemplate", e.target.value)}
                  placeholder="e.g. feat: add {{app_name}}"
                />
                <p className="hint">Scriban syntax. Overrides the template&apos;s commit message if set.</p>
              </div>

              {form.type === "github" && (
                <div className="field">
                  <label>GitHub Token — Environment Variable Name</label>
                  <input
                    type="text"
                    value={form.gitHubTokenEnv || ""}
                    onChange={(e) => updateField("gitHubTokenEnv", e.target.value)}
                    placeholder="GITHUB_TOKEN"
                  />
                  <p className="hint">
                    Name of the environment variable containing your PAT (e.g. <code>GITHUB_TOKEN</code>). Do not paste the token itself.
                  </p>
                </div>
              )}

              <div style={{ display: "flex", gap: 10, paddingTop: 12, borderTop: "1px solid var(--line)" }}>
                <button onClick={handleSave} disabled={saving} className="btn primary">
                  {saving ? "Saving..." : editing === "new" ? "Create Preset" : "Save Changes"}
                </button>
                <button onClick={cancel} className="btn">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 20, margin: 0 }}>Output Presets</h1>
          <p className="hint">
            Define reusable output configurations. Reference them in templates with <code>output.preset</code>.
          </p>
        </div>
        <button onClick={startCreate} className="btn primary">
          + New Preset
        </button>
      </div>

      {error && <div className="banner error">{error.message}</div>}

      {loading ? (
        <div className="spinner" />
      ) : presets.length === 0 ? (
        <div className="empty">
          <div className="title">No presets yet</div>
          <p className="desc">Create your first output preset to define where templates commit their output.</p>
          <button onClick={startCreate} className="btn primary" style={{ marginTop: 14 }}>
            Create Preset
          </button>
        </div>
      ) : (
        <div className="cards" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
          {presets.map((preset) => (
            <div key={preset.id} className="card">
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <h3 style={{ margin: 0, fontSize: 14 }}>{preset.name}</h3>
                    <span className={`badge ${preset.type === "github" ? "accent" : "blue"}`}>{preset.type}</span>
                  </div>
                  {preset.description && <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>{preset.description}</p>}
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  <button onClick={() => startEdit(preset)} className="icon-btn" title="Edit">
                    ✎
                  </button>
                  <button onClick={() => handleDelete(preset.id)} className="icon-btn" title="Delete">
                    ✕
                  </button>
                </div>
              </div>
              <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
                <div>
                  <span style={{ color: "var(--muted)", display: "inline-block", width: 60 }}>Repo</span>
                  <span>{preset.repo}</span>
                </div>
                <div>
                  <span style={{ color: "var(--muted)", display: "inline-block", width: 60 }}>Branch</span>
                  <span>{preset.branch}</span>
                </div>
                {preset.commitMessageTemplate && (
                  <div>
                    <span style={{ color: "var(--muted)", display: "inline-block", width: 60 }}>Commit</span>
                    <span>{preset.commitMessageTemplate}</span>
                  </div>
                )}
              </div>
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--line)" }}>
                <p className="hint">
                  Use in YAML: <code>preset: {preset.name}</code>
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
