"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { useApp } from "../../../components/AppContext";
import ApprovalActions from "../../../components/ApprovalActions";
import { ErrorState, Spinner, StatusBadge } from "../../../components/ui";
import { ApiError, fetchRequest, retryRequest, type ProvisioningRequest } from "../../../lib/api";

const TERMINAL = new Set(["completed", "failed", "rejected"]);

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

export default function RequestDetailPage({ params }: { params: { id: string } }) {
  const { orgId, isPlatformEngineer, token } = useApp();
  const [request, setRequest] = useState<ProvisioningRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | Error | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState<Error | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  const retry = async () => {
    setRetrying(true);
    setRetryError(null);
    try {
      await retryRequest(params.id, { orgId, token });
      load(true);
    } catch (err) {
      setRetryError(err as Error);
    } finally {
      setRetrying(false);
    }
  };

  const load = (showSpinner: boolean) => {
    if (showSpinner) setLoading(true);
    fetchRequest(params.id, { orgId, token })
      .then((r) => {
        setRequest(r);
        setError(null);
      })
      .catch((err) => showSpinner && setError(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load(true);
    return () => clearTimeout(timer.current);
  }, [params.id, orgId]);

  useEffect(() => {
    if (request && !TERMINAL.has(request.status)) {
      timer.current = setTimeout(() => load(false), 4000);
      return () => clearTimeout(timer.current);
    }
  }, [request]);

  let values: Record<string, unknown> = {};
  try {
    values = JSON.parse(request?.valuesJson || "{}");
  } catch {
    // ignore
  }

  return (
    <>
      <Link href="/requests" style={{ display: "inline-flex", color: "var(--muted)", marginBottom: 20 }}>
        ← Back to requests
      </Link>

      {loading && <Spinner />}
      {error && <ErrorState error={error} onRetry={() => load(true)} />}

      {!loading && !error && request && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
            <h1 style={{ margin: 0 }} className="svc-name">
              {request.name}
            </h1>
            <StatusBadge status={request.status} />
          </div>
          <p className="desc" style={{ marginBottom: 24 }}>
            {request.templateTitle}
          </p>

          {request.status === "pending-approval" && (
            <div className="banner">
              <strong>Awaiting platform-team approval</strong>
              {isPlatformEngineer ? (
                <div style={{ marginTop: 10 }}>
                  <ApprovalActions requestId={request.id} orgId={orgId} token={token} onDone={() => load(true)} />
                </div>
              ) : (
                <p style={{ margin: "6px 0 0" }}>A platform engineer must review this request before provisioning starts.</p>
              )}
            </div>
          )}

          {request.status === "failed" && (
            <div className="banner error">
              {request.errorMessage && <div>{request.errorMessage}</div>}
              <button onClick={retry} disabled={retrying} className="btn danger" style={{ marginTop: 10 }}>
                {retrying ? "Retrying…" : "Retry provisioning"}
              </button>
              {retryError && <div style={{ marginTop: 8 }}>{retryError.message}</div>}
            </div>
          )}

          {request.status === "rejected" && (
            <div className="banner">
              Rejected by {request.approvedBy || "platform team"}: {request.rejectionReason}
            </div>
          )}

          <div className="fields-grid" style={{ marginBottom: 24 }}>
            <Field label="Team" value={request.team} />
            <Field label="Owner" value={request.owner} />
            <Field label="Submitted by" value={request.submittedBy} />
            <Field label="Approved by" value={request.approvedBy} />
          </div>

          {request.commitUrl && (
            <a href={request.commitUrl} target="_blank" rel="noreferrer" style={{ display: "inline-block", marginBottom: 20, color: "var(--accent-soft)" }}>
              View commit ↗
            </a>
          )}

          <div className="panel">
            <h2>Submitted values</h2>
            <div className="kv-list">
              {Object.entries(values).map(([k, v]) => (
                <div key={k} className="kv-row">
                  <span className="k">{k}</span>
                  <span className="v">{String(v)}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  );
}
