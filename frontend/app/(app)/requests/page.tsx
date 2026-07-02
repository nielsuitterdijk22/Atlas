"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { useApp } from "../../components/AppContext";
import { EmptyState, ErrorState, PrimaryLink, Spinner, StatusBadge } from "../../components/ui";
import { timeAgo } from "../../lib/format";
import { ApiError, fetchRequests, type ProvisioningRequest } from "../../lib/api";

const TERMINAL = new Set(["completed", "failed", "rejected"]);

export default function RequestsPage() {
  const { orgId, token } = useApp();
  const [requests, setRequests] = useState<ProvisioningRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | Error | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  const load = (showSpinner: boolean) => {
    if (showSpinner) setLoading(true);
    fetchRequests({}, { orgId, token })
      .then((data) => {
        setRequests(data);
        setError(null);
      })
      .catch((err) => showSpinner && setError(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load(true);
    return () => clearTimeout(timer.current);
  }, [orgId]);

  useEffect(() => {
    const inFlight = requests.some((r) => !TERMINAL.has(r.status));
    if (inFlight) {
      timer.current = setTimeout(() => load(false), 4000);
      return () => clearTimeout(timer.current);
    }
  }, [requests]);

  return (
    <>
      <div className="top">
        <div>
          <div className="kicker">Activity</div>
          <h1>My Requests</h1>
          <p className="desc">Provisioning runs and approvals. Nothing blocks — submit, then track.</p>
        </div>
        <PrimaryLink href="/create">Create</PrimaryLink>
      </div>

      {loading && <Spinner />}
      {error && <ErrorState error={error} onRetry={() => load(true)} />}

      {!loading && !error && (
        requests.length === 0 ? (
          <EmptyState
            icon="📋"
            title="No requests yet"
            description="Create a service and it will show up here with live status."
            action={<PrimaryLink href="/create">Create a service</PrimaryLink>}
          />
        ) : (
          <div className="panel">
            <div className="row-link" style={{ color: "var(--muted)", fontSize: 11, textTransform: "uppercase" }}>
              <span style={{ flex: 1 }}>Name</span>
              <span style={{ width: 200 }}>Template</span>
              <span style={{ width: 160 }}>Status</span>
              <span style={{ width: 100, textAlign: "right" }}>When</span>
            </div>
            {requests.map((r) => (
              <Link key={r.id} href={`/requests/${r.id}`} className="row-link">
                <span className="svc-name" style={{ flex: 1 }}>
                  {r.name}
                </span>
                <span style={{ width: 200, color: "var(--muted)" }}>{r.templateTitle}</span>
                <span style={{ width: 160 }}>
                  <StatusBadge status={r.status} />
                </span>
                <span style={{ width: 100, textAlign: "right", color: "var(--muted)" }}>{timeAgo(r.createdAt)}</span>
              </Link>
            ))}
          </div>
        )
      )}
    </>
  );
}
