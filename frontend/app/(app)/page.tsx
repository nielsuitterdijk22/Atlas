"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { useApp } from "../components/AppContext";
import { ErrorState, LifecycleBadge, PrimaryLink, Spinner, StatusBadge } from "../components/ui";
import { ApiError, fetchRequests, fetchServices, type ProvisioningRequest, type Service } from "../lib/api";

function Stat({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link href={href} className="card">
      <div className="k">{label}</div>
      <div className="v">{value}</div>
    </Link>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="panel">
      <h2>{title}</h2>
      <div className="panel-pad">{children}</div>
    </div>
  );
}

export default function HomePage() {
  const { user, orgId, token } = useApp();
  const [services, setServices] = useState<Service[]>([]);
  const [serviceTotal, setServiceTotal] = useState(0);
  const [requests, setRequests] = useState<ProvisioningRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | Error | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    Promise.all([fetchServices({ pageSize: 6 }, { orgId, token }), fetchRequests({}, { orgId, token })])
      .then(([s, r]) => {
        setServices(s.items);
        setServiceTotal(s.total);
        setRequests(r);
      })
      .catch(setError)
      .finally(() => setLoading(false));
  };

  useEffect(load, [orgId]);

  const openRequests = requests.filter((r) => r.status === "provisioning" || r.status === "pending-approval");

  return (
    <>
      <div className="top">
        <div>
          <div className="kicker">Welcome back</div>
          <h1>Hi {(user.displayName || "there").split(" ")[0]} 👋</h1>
          <p className="desc">Self-service infrastructure. Ship from a golden path — governance is built in.</p>
        </div>
        <PrimaryLink href="/create">Create</PrimaryLink>
      </div>

      {loading && <Spinner />}
      {error && <ErrorState error={error} onRetry={load} />}

      {!loading && !error && (
        <>
          <div className="cards" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
            <Stat label="Services in catalog" value={serviceTotal} href="/catalog" />
            <Stat label="Open requests" value={openRequests.length} href="/requests" />
          </div>

          <div className="grid-2">
            <Panel title="Recent services">
              {services.length === 0 && <p style={{ color: "var(--muted)" }}>Nothing yet.</p>}
              {services.slice(0, 6).map((s) => (
                <Link key={s.id} href={`/catalog/${s.id}`} className="row-link" style={{ padding: "10px 0" }}>
                  <span className="svc-name">{s.name}</span>
                  <span style={{ marginLeft: "auto" }}>
                    <LifecycleBadge lifecycle={s.lifecycle} />
                  </span>
                </Link>
              ))}
            </Panel>

            <Panel title="Open requests">
              {openRequests.length === 0 && <p style={{ color: "var(--muted)" }}>Nothing in flight.</p>}
              {openRequests.slice(0, 6).map((r) => (
                <Link key={r.id} href={`/requests/${r.id}`} className="row-link" style={{ padding: "10px 0" }}>
                  <div>
                    <div className="svc-name">{r.name}</div>
                    <div style={{ fontSize: 12, color: "var(--muted)" }}>{r.templateTitle}</div>
                  </div>
                  <span style={{ marginLeft: "auto" }}>
                    <StatusBadge status={r.status} />
                  </span>
                </Link>
              ))}
            </Panel>
          </div>
        </>
      )}
    </>
  );
}
