import { useState, useEffect } from 'react'
import { fetchTemplates } from '../api'
import TemplateCard from '../components/TemplateCard'
import { Page, PageHeader, Spinner, ErrorState, EmptyState, Pagination } from '../components/ui'

const PAGE_SIZE = 6

export default function CreatePage() {
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(1)

  const load = () => {
    setLoading(true)
    setError(null)
    fetchTemplates()
      .then((t) => { setTemplates(t); setPage(1) })
      .catch(setError)
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const totalPages = Math.ceil(templates.length / PAGE_SIZE)
  const pageItems = templates.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <Page>
      <PageHeader
        kicker="Golden Paths"
        title="Create something"
        description="Pick a template. Each one scaffolds a compliant service — fill in a short guided form and Yaly commits the result for you."
      />

      {loading && <Spinner />}
      {error && <ErrorState error={error} onRetry={load} />}

      {!loading && !error && (
        templates.length === 0 ? (
          <EmptyState
            title="No templates found"
            description="Add YAML definitions to the catalog folder to get started."
          />
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pageItems.map((t) => (
                <TemplateCard key={t.metadata.name} template={t} />
              ))}
            </div>
            <Pagination
              page={page}
              totalPages={totalPages}
              total={templates.length}
              noun="templates"
              onPage={setPage}
            />
          </>
        )
      )}
    </Page>
  )
}
