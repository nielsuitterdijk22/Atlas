"use client";

import { useState } from "react";

import { approveRequest, ApiError, rejectRequest } from "../lib/api";

/** Approve / Reject controls for a pending-approval request. Platform-engineer only. */
export default function ApprovalActions({
  requestId,
  orgId,
  token,
  onDone,
}: {
  requestId: string;
  orgId: string;
  token: string;
  onDone?: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<ApiError | Error | null>(null);

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      onDone?.();
    } catch (err) {
      setError(err as Error);
      setBusy(false);
    }
  };

  if (rejecting) {
    return (
      <div>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={2}
          placeholder="Reason for rejection…"
        />
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <button
            disabled={busy || !reason.trim()}
            onClick={() => run(() => rejectRequest(requestId, reason.trim(), { orgId, token }))}
            className="btn danger"
          >
            Confirm rejection
          </button>
          <button onClick={() => setRejecting(false)} className="btn">
            Cancel
          </button>
        </div>
        {error && <p className="field err">{error.message}</p>}
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 8 }}>
        <button disabled={busy} onClick={() => run(() => approveRequest(requestId, undefined, { orgId, token }))} className="btn primary">
          {busy ? "Working…" : "Approve"}
        </button>
        <button disabled={busy} onClick={() => setRejecting(true)} className="btn">
          Reject
        </button>
      </div>
      {error && <p className="field err">{error.message}</p>}
    </div>
  );
}
