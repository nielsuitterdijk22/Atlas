import { useState, useEffect } from 'react'
import { fetchTemplates } from '../api'
import TemplateCard from '../components/TemplateCard'

export default function CatalogPage() {
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchTemplates()
      .then(setTemplates)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-red-50 rounded-full mb-4">
          <span className="text-3xl">⚠️</span>
        </div>
        <h2 className="text-lg font-semibold text-gray-900">Failed to load catalog</h2>
        <p className="mt-1 text-sm text-gray-500">{error}</p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Templates</h1>
        <p className="mt-2 text-gray-500">
          Choose a template to get started. Each template will guide you through the inputs and commit the result to a repository.
        </p>
      </div>

      {templates.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-50 rounded-full mb-4">
            <span className="text-3xl">📭</span>
          </div>
          <h2 className="text-lg font-semibold text-gray-900">No templates found</h2>
          <p className="mt-1 text-sm text-gray-500">Add YAML definitions to the catalog folder to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((t) => (
            <TemplateCard key={t.metadata.name} template={t} />
          ))}
        </div>
      )}
    </div>
  )
}
