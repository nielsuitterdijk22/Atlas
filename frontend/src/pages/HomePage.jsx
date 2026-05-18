import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { fetchServices, fetchRequests } from '../api'
import { useAuth } from '../context/AuthContext'
import { Page, PageHeader, Spinner, ErrorState, StatusBadge, LifecycleBadge, PrimaryLink } from '../components/ui'

function Stat({ label, value, to }) {
  return (
    <Link to={to} className="block p-5 rounded-xl bg-white border border-gray-200 hover:border-indigo-300 transition-colors">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-3xl font-bold text-gray-900 mt-2">{value}</div>
    </Link>
  )
}

function Panel({ title, children }) {
  return (
    <div className="p-5 rounded-xl bg-white border border-gray-200">
      <div className="text-sm font-semibold text-gray-900 mb-3">{title}</div>
      {children}
    </div>
  )
}

export default function HomePage() {
  const { user } = useAuth()
  const [services, setServices] = useState([])
  const [serviceTotal, setServiceTotal] = useState(0)
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = () => {
    setLoading(true)
    setError(null)
    Promise.all([fetchServices({ pageSize: 6 }), fetchRequests()])
      .then(([s, r]) => {
        setServices(s.items)
        setServiceTotal(s.total)
        setRequests(r)
      })
      .catch(setError)
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const openRequests = requests.filter(
    (r) => r.status === 'provisioning' || r.status === 'pending-approval'
  )

  return (
    <Page>
      <PageHeader
        kicker="Welcome back"
        title={`Hi ${(user.displayName || 'there').split(' ')[0]} 👋`}
        description="Self-service infrastructure. Ship from a golden path — governance is built in."
        action={<PrimaryLink to="/create">Create</PrimaryLink>}
      />

      {loading && <Spinner />}
      {error && <ErrorState error={error} onRetry={load} />}

      {!loading && !error && (
        <>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <Stat label="Services in catalog" value={serviceTotal} to="/catalog" />
            <Stat label="Open requests" value={openRequests.length} to="/requests" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Panel title="Recent services">
              {services.length === 0 && <p className="text-sm text-gray-400 py-3">Nothing yet.</p>}
              {services.slice(0, 6).map((s) => (
                <Link
                  key={s.id}
                  to={`/catalog/${s.id}`}
                  className="flex items-center gap-3 py-2.5 border-b border-gray-100 last:border-0 hover:opacity-70"
                >
                  <span className="font-mono text-sm font-medium text-gray-900">{s.name}</span>
                  <span className="ml-auto"><LifecycleBadge lifecycle={s.lifecycle} /></span>
                </Link>
              ))}
            </Panel>

            <Panel title="Open requests">
              {openRequests.length === 0 && <p className="text-sm text-gray-400 py-3">Nothing in flight.</p>}
              {openRequests.slice(0, 6).map((r) => (
                <Link
                  key={r.id}
                  to={`/requests/${r.id}`}
                  className="flex items-center gap-3 py-2.5 border-b border-gray-100 last:border-0 hover:opacity-70"
                >
                  <div>
                    <div className="font-mono text-sm font-medium text-gray-900">{r.name}</div>
                    <div className="text-xs text-gray-400">{r.templateTitle}</div>
                  </div>
                  <span className="ml-auto"><StatusBadge status={r.status} /></span>
                </Link>
              ))}
            </Panel>
          </div>
        </>
      )}
    </Page>
  )
}
