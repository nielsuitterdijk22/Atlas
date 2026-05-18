import { useState } from 'react'
import { approveRequest, rejectRequest } from '../api'

/** Approve / Reject controls for a pending-approval request. Platform-engineer only. */
export default function ApprovalActions({ requestId, onDone }) {
  const [busy, setBusy] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState('')
  const [error, setError] = useState(null)

  const run = async (fn) => {
    setBusy(true)
    setError(null)
    try {
      await fn()
      onDone?.()
    } catch (err) {
      setError(err.detail || err.message)
      setBusy(false)
    }
  }

  if (rejecting) {
    return (
      <div className="space-y-2">
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={2}
          placeholder="Reason for rejection…"
          className="w-full rounded-lg border border-gray-300 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <div className="flex gap-2">
          <button
            disabled={busy || !reason.trim()}
            onClick={() => run(() => rejectRequest(requestId, reason.trim()))}
            className="px-3 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            Confirm rejection
          </button>
          <button
            onClick={() => setRejecting(false)}
            className="px-3 py-2 text-sm font-semibold text-gray-600"
          >
            Cancel
          </button>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    )
  }

  return (
    <div>
      <div className="flex gap-2">
        <button
          disabled={busy}
          onClick={() => run(() => approveRequest(requestId))}
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50"
        >
          {busy ? 'Working…' : 'Approve'}
        </button>
        <button
          disabled={busy}
          onClick={() => setRejecting(true)}
          className="px-4 py-2 bg-white border border-gray-300 text-sm font-semibold text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          Reject
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  )
}
