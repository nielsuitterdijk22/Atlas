import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { fetchRequests } from '../api'
import { Page, PageHeader, Spinner, ErrorState, EmptyState, StatusBadge, PrimaryLink } from '../components/ui'

const TERMINAL = new Set(['completed', 'failed', 'rejected'])

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.round(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs} h ago`
  return `${Math.round(hrs / 24)} d ago`
}

export default function RequestsPage() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const timer = useRef(null)

  const load = (showSpinner) => {
    if (showSpinner) setLoading(true)
    fetchRequests()
      .then((data) => {
        setRequests(data)
        setError(null)
      })
      .catch((err) => showSpinner && setError(err))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load(true)
    return () => clearTimeout(timer.current)
  }, [])

  // Poll while any request is still in flight.
  useEffect(() => {
    const inFlight = requests.some((r) => !TERMINAL.has(r.status))
    if (inFlight) {
      timer.current = setTimeout(() => load(false), 4000)
      return () => clearTimeout(timer.current)
    }
  }, [requests])

  return (
    <Page>
      <PageHeader
        kicker="Activity"
        title="My Requests"
        description="Provisioning runs and approvals. Nothing blocks — submit, then track."
        action={<PrimaryLink to="/create">Create</PrimaryLink>}
      />

      {loading && <Spinner />}
      {error && <ErrorState error={error} onRetry={() => load(true)} />}

      {!loading && !error && (
        requests.length === 0 ? (
          <EmptyState
            icon="📋"
            title="No requests yet"
            description="Create a service and it will show up here with live status."
            action={<PrimaryLink to="/create">Create a service</PrimaryLink>}
          />
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex px-4 py-2.5 border-b border-gray-200 text-[11px] text-gray-400 uppercase tracking-wide">
              <span className="flex-1">Name</span>
              <span className="w-48">Template</span>
              <span className="w-40">Status</span>
              <span className="w-24 text-right">When</span>
            </div>
            {requests.map((r) => (
              <Link
                key={r.id}
                to={`/requests/${r.id}`}
                className="flex items-center px-4 py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 text-sm"
              >
                <span className="flex-1 font-mono font-medium text-gray-900">{r.name}</span>
                <span className="w-48 text-gray-500">{r.templateTitle}</span>
                <span className="w-40"><StatusBadge status={r.status} /></span>
                <span className="w-24 text-right text-gray-400">{timeAgo(r.createdAt)}</span>
              </Link>
            ))}
          </div>
        )
      )}
    </Page>
  )
}
