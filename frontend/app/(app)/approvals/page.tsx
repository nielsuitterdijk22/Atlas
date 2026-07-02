"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useApp } from "../../components/AppContext";
import ApprovalActions from "../../components/ApprovalActions";
import { EmptyState, ErrorState, Spinner } from "../../components/ui";
import { ApiError, fetchRequests, type ProvisioningRequest } from "../../lib/api";

export default function ApprovalsPage() {
  const { orgId, isPlatformEngineer, token } = useApp();
  const router = useRouter();
  const [requests, setRequests] = useState<ProvisioningRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | Error | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    fetchRequests({ status: "pending-approval" }, { orgId, token })
      .then(setRequests)
      .catch(setError)
      .finally(() => setLoading(false));
  };

  // Developers have no business here — bounce them home.
  useEffect(() => {
    if (!isPlatformEngineer) router.replace("/");
  }, [isPlatformEngineer, router]);

  useEffect(() => {
    if (isPlatformEngineer) load();
  }, [orgId, isPlatformEngineer]);

  if (!isPlatformEngineer) return null;

  return (
    <>
      <div className="top">
        <div>
          <div className="kicker">Governance</div>
          <h1>Approvals</h1>
          <p className="desc">Requests from gated templates queue here. Approve to provision, or reject with a reason.</p>
        </div>
      </div>

      {loading && <Spinner />}
      {error && <ErrorState error={error} onRetry={load} />}

      {!loading && !error && (
        requests.length === 0 ? (
          <EmptyState icon="✅" title="Nothing to review" description="No requests are awaiting approval." />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {requests.map((r) => (
              <div key={r.id} className="panel">
                <div className="panel-pad" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
                  <div>
                    <Link href={`/requests/${r.id}`} className="svc-name">
                      {r.name}
                    </Link>
                    <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 2 }}>
                      {r.templateTitle} · {r.team || "Unassigned"} · submitted by {r.submittedBy}
                    </div>
                  </div>
                  <ApprovalActions requestId={r.id} orgId={orgId} token={token} onDone={load} />
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </>
  );
}
