import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { fetchService } from '../api'
import { Page, Spinner, ErrorState, LifecycleBadge } from '../components/ui'

function Field({ label, value }) {
  return (
    <div className="p-3.5 rounded-lg bg-white border border-gray-200">
      <div className="text-[11px] text-gray-400 uppercase tracking-wide mb-1">{label}</div>
      <div className="font-mono text-sm text-gray-900 break-all">{value || '—'}</div>
    </div>
  )
}

export default function ServiceDetailPage() {
  const { id } = useParams()
  const [service, setService] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = () => {
    setLoading(true)
    setError(null)
    fetchService(id)
      .then(setService)
      .catch(setError)
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [id])

  return (
    <Page>
      <Link to="/catalog" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-5">
        ← Back to catalog
      </Link>

      {loading && <Spinner />}
      {error && <ErrorState error={error} onRetry={load} />}

      {!loading && !error && service && (
        <>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-bold text-gray-900 font-mono">{service.name}</h1>
            <LifecycleBadge lifecycle={service.lifecycle} />
          </div>
          <p className="text-gray-500 mb-6 max-w-2xl">
            {service.description || 'No description provided.'}
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <Field label="Type" value={service.serviceType} />
            <Field label="Team" value={service.team} />
            <Field label="Owner" value={service.owner} />
            <Field label="Template" value={service.templateName} />
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="text-sm font-semibold text-gray-900 mb-3">Quick links</div>
            <div className="flex flex-col gap-2">
              {service.repoUrl ? (
                <a
                  href={service.repoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-indigo-600 hover:underline"
                >
                  Source repository ↗
                </a>
              ) : (
                <span className="text-sm text-gray-400">
                  No repository link (committed to a local target).
                </span>
              )}
              <Link
                to={`/requests/${service.requestId}`}
                className="inline-flex items-center gap-2 text-sm text-indigo-600 hover:underline"
              >
                Provisioning request →
              </Link>
            </div>
          </div>
        </>
      )}
    </Page>
  )
}
