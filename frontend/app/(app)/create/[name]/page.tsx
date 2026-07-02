"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { useApp } from "../../../components/AppContext";
import FormField from "../../../components/FormField";
import { ErrorState, Spinner } from "../../../components/ui";
import { TEAMS } from "../../../constants";
import { ApiError, createRequest, fetchTemplate, type TemplateDefinition } from "../../../lib/api";

const STEPS = ["Basics", "Configure", "Review & launch"];

/** Mirrors RequestsController.ResolveNameInput on the backend. */
function resolveNameInput(spec: TemplateDefinition["spec"]): string | null {
  if (spec.nameInput) return spec.nameInput;
  if (spec.inputs.some((i) => i.id === "name")) return "name";
  if (spec.inputs.some((i) => i.id === "service_name")) return "service_name";
  return spec.inputs.find((i) => i.required && i.type === "string")?.id ?? null;
}

function Stepper({ step }: { step: number }) {
  return (
    <div className="stepper">
      {STEPS.map((label, i) => (
        <div key={label} className="step-item">
          <div className={`step-dot ${i < step ? "done" : i === step ? "active" : ""}`}>{i < step ? "✓" : i + 1}</div>
          <span className={`step-label ${i === step ? "active" : ""}`}>{label}</span>
          {i < STEPS.length - 1 && <div className="step-rule" />}
        </div>
      ))}
    </div>
  );
}

export default function WizardPage({ params }: { params: { name: string } }) {
  const router = useRouter();
  const { user, orgId, token } = useApp();

  const [template, setTemplate] = useState<TemplateDefinition | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<ApiError | Error | null>(null);

  const [step, setStep] = useState(0);
  const [basics, setBasics] = useState({ name: "", team: TEAMS[0], owner: user.username });
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<ApiError | Error | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchTemplate(params.name, { orgId, token })
      .then((t) => {
        setTemplate(t);
        const defaults: Record<string, unknown> = {};
        t.spec.inputs.forEach((input) => {
          if (input.default !== undefined && input.default !== null) defaults[input.id] = input.default;
        });
        setValues(defaults);
      })
      .catch(setLoadError)
      .finally(() => setLoading(false));
  }, [params.name, orgId]);

  const nameInputId = useMemo(() => (template ? resolveNameInput(template.spec) : null), [template]);

  const configureInputs = useMemo(() => {
    if (!template) return [];
    const hidden = new Set([nameInputId, "owner", "team"]);
    return template.spec.inputs.filter((i) => !hidden.has(i.id));
  }, [template, nameInputId]);

  if (loading) return <Spinner />;
  if (loadError) {
    return (
      <>
        <ErrorState error={loadError} />
        <Link href="/create" style={{ color: "var(--accent-soft)" }}>
          ← Back to templates
        </Link>
      </>
    );
  }
  if (!template) return null;

  const { metadata, spec } = template;
  const needsApproval = spec.approvalRequired;

  const validateConfigure = () => {
    const next: Record<string, string> = {};
    configureInputs.forEach((input) => {
      const val = values[input.id];
      if (input.required && (val === undefined || val === null || val === "")) {
        next[input.id] = "This field is required";
      }
      if (input.pattern && val && !new RegExp(input.pattern).test(String(val))) {
        next[input.id] = `Must match pattern: ${input.pattern}`;
      }
      if (input.type === "number" && val !== undefined && val !== "") {
        const num = Number(val);
        if (input.min !== undefined && input.min !== null && num < input.min) next[input.id] = `Minimum value is ${input.min}`;
        if (input.max !== undefined && input.max !== null && num > input.max) next[input.id] = `Maximum value is ${input.max}`;
      }
    });
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const basicsValid = basics.name.trim().length > 1 && basics.team && basics.owner.trim();

  const next = () => {
    if (step === 1 && !validateConfigure()) return;
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const submit = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const req = await createRequest(
        {
          templateName: metadata.name,
          name: basics.name.trim(),
          team: basics.team,
          owner: basics.owner.trim(),
          values,
        },
        { orgId, token },
      );
      router.push(`/requests/${req.id}`);
    } catch (err) {
      setSubmitError(err as Error);
      setSubmitting(false);
    }
  };

  const reviewRows: [string, string][] = [
    ["Template", metadata.title],
    ["Service name", basics.name],
    ["Team", basics.team],
    ["Owner", basics.owner],
    ...configureInputs.map((i): [string, string] => [i.title, String(values[i.id] ?? "—")]),
  ];

  return (
    <>
      <Link href="/create" style={{ display: "inline-flex", color: "var(--muted)", marginBottom: 20 }}>
        ← Back to templates
      </Link>
      <h1 style={{ fontSize: 24, marginBottom: 4 }}>New {metadata.title}</h1>
      <p className="desc" style={{ marginBottom: 24 }}>
        {metadata.description}
      </p>

      <Stepper step={step} />

      <div className="panel">
        <div className="panel-pad">
          {step === 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div className="field">
                <label>
                  Service name <span className="req">*</span>
                </label>
                <p className="hint" style={{ marginBottom: 6 }}>
                  Lowercase, hyphenated. Drives the repo and resource naming.
                </p>
                <input
                  value={basics.name}
                  onChange={(e) => setBasics({ ...basics, name: e.target.value })}
                  placeholder="e.g. fraud-scoring-api"
                  style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}
                />
              </div>
              <div className="grid-2">
                <div className="field">
                  <label>
                    Owning team <span className="req">*</span>
                  </label>
                  <select value={basics.team} onChange={(e) => setBasics({ ...basics, team: e.target.value })}>
                    {TEAMS.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>
                    Owner <span className="req">*</span>
                  </label>
                  <input
                    value={basics.owner}
                    onChange={(e) => setBasics({ ...basics, owner: e.target.value })}
                    style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}
                  />
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div>
              {configureInputs.length === 0 && (
                <p style={{ color: "var(--muted)" }}>This template has no extra configuration — continue to review.</p>
              )}
              {configureInputs.map((input) => (
                <FormField
                  key={input.id}
                  input={input}
                  value={values[input.id]}
                  onChange={(val) => setValues((prev) => ({ ...prev, [input.id]: val }))}
                  error={errors[input.id]}
                />
              ))}
            </div>
          )}

          {step === 2 && (
            <div>
              {needsApproval && (
                <div className="banner">
                  ⚠️ This template needs <strong>platform-team approval</strong>. The request will be queued for
                  review before provisioning starts.
                </div>
              )}
              <div style={{ fontWeight: 600, marginBottom: 8 }}>Provisioning plan</div>
              <div className="kv-list">
                {reviewRows.map(([k, v]) => (
                  <div key={k} className="kv-row">
                    <span className="k">{k}</span>
                    <span className="v">{v}</span>
                  </div>
                ))}
              </div>
              {submitError && <p className="field err">{submitError.message}</p>}
            </div>
          )}
        </div>
      </div>

      <div className="wizard-actions">
        <button onClick={step === 0 ? () => router.push("/create") : back} className="btn">
          {step === 0 ? "Cancel" : "← Back"}
        </button>
        {step < 2 ? (
          <button onClick={next} disabled={step === 0 && !basicsValid} className="btn primary">
            Continue →
          </button>
        ) : (
          <button onClick={submit} disabled={submitting} className="btn primary">
            {submitting ? "Submitting…" : needsApproval ? "Submit for approval" : "Launch"}
          </button>
        )}
      </div>
    </>
  );
}
