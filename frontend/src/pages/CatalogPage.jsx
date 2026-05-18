import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { fetchServices } from '../api'
import { TEAMS } from '../constants'
import {
  Page, PageHeader, Spinner, ErrorState, EmptyState, LifecycleBadge, PrimaryLink, Pagination,
} from '../components/ui'

const PAGE_SIZE = 12

export default function CatalogPage() {
  const [data, setData] = useState({ items: [], total: 0, page: 1, pageSize: PAGE_SIZE })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [team, setTeam] = useState('')
  const [page, setPage] = useState(1)

  // Debounce search input so we don't hit the API on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])

  // Reset to page 1 whenever the filters change.
  useEffect(() => { setPage(1) }, [debouncedSearch, team])

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetchServices({ search: debouncedSearch, team, page, pageSize: PAGE_SIZE })
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false))
  }, [debouncedSearch, team, page])

  const totalPages = Math.ceil(data.total / PAGE_SIZE)
  const hasFilters = debouncedSearch || team

  return (
    <Page>
      <PageHeader
        kicker="Software Catalog"
        title="Catalog"
        description="Every service created through Yaly, with ownership and lifecycle. Populated automatically — nothing is hand-registered."
      />

      <div className="flex gap-3 mb-5">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search services…"
          className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <select
          value={team}
          onChange={(e) => setTeam(e.target.value)}
          className="px-3 py-2.5 rounded-lg border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All teams</option>
          {TEAMS.map((t) => <option key={t}>{t}</option>)}
        </select>
      </div>

      {loading && <Spinner />}
      {error && <ErrorState error={error} onRetry={() => setPage((p) => p)} />}

      {!loading && !error && (
        data.items.length === 0 ? (
          <EmptyState
            icon="📦"
            title={hasFilters ? 'No matching services' : 'No services yet'}
            description={
              hasFilters
                ? 'Try a different search or team filter.'
                : 'Create your first service to populate the catalog.'
            }
            action={!hasFilters && <PrimaryLink to="/create">Create a service</PrimaryLink>}
          />
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.items.map((s) => (
                <Link
                  key={s.id}
                  to={`/catalog/${s.id}`}
                  className="block bg-white rounded-xl border border-gray-200 p-5 hover:border-indigo-300 hover:shadow-md transition-all"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="font-mono font-medium text-gray-900">{s.name}</span>
                    <span className="ml-auto"><LifecycleBadge lifecycle={s.lifecycle} /></span>
                  </div>
                  <p className="text-sm text-gray-500 line-clamp-2 min-h-[2.5rem]">
                    {s.description || 'No description provided.'}
                  </p>
                  <div className="mt-3 flex items-center gap-3 text-xs text-gray-400">
                    <span>{s.serviceType}</span>
                    <span>·</span>
                    <span>{s.team || 'Unassigned'}</span>
                  </div>
                </Link>
              ))}
            </div>
            <Pagination
              page={page}
              totalPages={totalPages}
              total={data.total}
              noun="services"
              onPage={setPage}
            />
          </>
        )
      )}
    </Page>
  )
}
