import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { fetchRequest } from '../api'
import { useIsPlatformEngineer } from '../context/AuthContext'
import ApprovalActions from '../components/ApprovalActions'
import { Page, Spinner, ErrorState, StatusBadge } from '../components/ui'

const TERMINAL = new Set(['completed', 'failed', 'rejected'])

function Field({ label, value }) {
  return (
    <div className="p-3.5 rounded-lg bg-white border border-gray-200">
      <div className="text-[11px] text-gray-400 uppercase tracking-wide mb-1">{label}</div>
      <div className="font-mono text-sm text-gray-900 break-all">{value || '—'}</div>
    </div>
  )
}

export default function RequestDetailPage() {
  const { id } = useParams()
  const isPlatformEngineer = useIsPlatformEngineer()
  const [request, setRequest] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const timer = useRef(null)

  const load = (showSpinner) => {
    if (showSpinner) setLoading(true)
    fetchRequest(id)
      .then((r) => { setRequest(r); setError(null) })
      .catch((err) => showSpinner && setError(err))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load(true)
    return () => clearTimeout(timer.current)
  }, [id])

  useEffect(() => {
    if (request && !TERMINAL.has(request.status)) {
      timer.current = setTimeout(() => load(false), 4000)
      return () => clearTimeout(timer.current)
    }
  }, [request])

  let values = {}
  try { values = JSON.parse(request?.valuesJson || '{}') } catch { /* ignore */ }

  return (
    <Page>
      <Link to="/requests" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-5">
        ← Back to requests
      </Link>

      {loading && <Spinner />}
      {error && <ErrorState error={error} onRetry={() => load(true)} />}

      {!loading && !error && request && (
        <>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-bold text-gray-900 font-mono">{request.name}</h1>
            <StatusBadge status={request.status} />
          </div>
          <p className="text-gray-500 mb-6">{request.templateTitle}</p>

          {request.status === 'pending-approval' && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
              <div className="text-sm font-semibold text-amber-800 mb-1">Awaiting platform-team approval</div>
              {isPlatformEngineer ? (
                <div className="mt-3">
                  <ApprovalActions requestId={request.id} onDone={() => load(true)} />
                </div>
              ) : (
                <p className="text-sm text-amber-700">
                  A platform engineer must review this request before provisioning starts.
                </p>
              )}
            </div>
          )}

          {request.status === 'failed' && request.errorMessage && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-sm text-red-700">
              {request.errorMessage}
            </div>
          )}

          {request.status === 'rejected' && (
            <div className="bg-gray-100 border border-gray-200 rounded-xl p-4 mb-6 text-sm text-gray-600">
              Rejected by {request.approvedBy || 'platform team'}: {request.rejectionReason}
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <Field label="Team" value={request.team} />
            <Field label="Owner" value={request.owner} />
            <Field label="Submitted by" value={request.submittedBy} />
            <Field label="Approved by" value={request.approvedBy} />
          </div>

          {request.commitUrl && (
            <a
              href={request.commitUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-block mb-6 text-sm text-indigo-600 hover:underline"
            >
              View commit ↗
            </a>
          )}

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="text-sm font-semibold text-gray-900 mb-3">Submitted values</div>
            <div className="rounded-lg border border-gray-200 overflow-hidden">
              {Object.entries(values).map(([k, v], i) => (
                <div key={k} className={`flex justify-between px-4 py-2 text-sm ${i % 2 ? 'bg-gray-50' : 'bg-white'}`}>
                  <span className="text-gray-500">{k}</span>
                  <span className="font-mono text-gray-900">{String(v)}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </Page>
  )
}
