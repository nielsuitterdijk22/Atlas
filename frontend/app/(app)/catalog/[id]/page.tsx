"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { useApp } from "../../../components/AppContext";
import { ErrorState, LifecycleBadge, Spinner } from "../../../components/ui";
import { ApiError, fetchService, type Service } from "../../../lib/api";

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="field-box">
      <div className="k">{label}</div>
      <div className="v" style={{ wordBreak: "break-all" }}>
        {value || "—"}
      </div>
    </div>
  );
}

export default function ServiceDetailPage({ params }: { params: { id: string } }) {
  const { orgId, token } = useApp();
  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | Error | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    fetchService(params.id, { orgId, token }).then(setService).catch(setError).finally(() => setLoading(false));
  };

  useEffect(load, [params.id, orgId]);

  return (
    <>
      <Link href="/catalog" style={{ display: "inline-flex", color: "var(--muted)", marginBottom: 20 }}>
        ← Back to catalog
      </Link>

      {loading && <Spinner />}
      {error && <ErrorState error={error} onRetry={load} />}

      {!loading && !error && service && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
            <h1 style={{ margin: 0 }} className="svc-name">
              {service.name}
            </h1>
            <LifecycleBadge lifecycle={service.lifecycle} />
          </div>
          <p className="desc" style={{ marginBottom: 24 }}>
            {service.description || "No description provided."}
          </p>

          <div className="fields-grid" style={{ marginBottom: 24 }}>
            <Field label="Type" value={service.serviceType} />
            <Field label="Team" value={service.team} />
            <Field label="Owner" value={service.owner} />
            <Field label="Template" value={service.templateName} />
          </div>

          <div className="panel">
            <h2>Quick links</h2>
            <div className="panel-pad" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {service.repoUrl ? (
                <a href={service.repoUrl} target="_blank" rel="noreferrer" style={{ color: "var(--accent-soft)" }}>
                  Source repository ↗
                </a>
              ) : (
                <span style={{ color: "var(--muted)" }}>No repository link (committed to a local target).</span>
              )}
              <Link href={`/requests/${service.requestId}`} style={{ color: "var(--accent-soft)" }}>
                Provisioning request →
              </Link>
            </div>
          </div>
        </>
      )}
    </>
  );
}
