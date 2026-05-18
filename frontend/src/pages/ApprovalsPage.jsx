import { useState, useEffect } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { fetchRequests } from '../api'
import { useIsPlatformEngineer } from '../context/AuthContext'
import ApprovalActions from '../components/ApprovalActions'
import { Page, PageHeader, Spinner, ErrorState, EmptyState } from '../components/ui'

export default function ApprovalsPage() {
  const isPlatformEngineer = useIsPlatformEngineer()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = () => {
    setLoading(true)
    setError(null)
    fetchRequests({ status: 'pending-approval' })
      .then(setRequests)
      .catch(setError)
      .finally(() => setLoading(false))
  }

  useEffect(() => { if (isPlatformEngineer) load() }, [isPlatformEngineer])

  // Developers have no business here — bounce them home.
  if (!isPlatformEngineer) return <Navigate to="/" replace />

  return (
    <Page>
      <PageHeader
        kicker="Governance"
        title="Approvals"
        description="Requests from gated templates queue here. Approve to provision, or reject with a reason."
      />

      {loading && <Spinner />}
      {error && <ErrorState error={error} onRetry={load} />}

      {!loading && !error && (
        requests.length === 0 ? (
          <EmptyState icon="✅" title="Nothing to review" description="No requests are awaiting approval." />
        ) : (
          <div className="space-y-3">
            {requests.map((r) => (
              <div key={r.id} className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <Link to={`/requests/${r.id}`} className="font-mono font-medium text-gray-900 hover:text-indigo-600">
                      {r.name}
                    </Link>
                    <div className="text-sm text-gray-500 mt-0.5">
                      {r.templateTitle} · {r.team || 'Unassigned'} · submitted by {r.submittedBy}
                    </div>
                  </div>
                  <ApprovalActions requestId={r.id} onDone={load} />
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </Page>
  )
}
