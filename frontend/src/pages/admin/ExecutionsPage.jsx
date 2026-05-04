import { useState, useEffect } from 'react'
import { fetchExecutions } from '../../api'

const statusStyles = {
  success: 'bg-green-50 text-green-700 ring-green-600/20',
  failed: 'bg-red-50 text-red-700 ring-red-600/20',
  pending: 'bg-yellow-50 text-yellow-700 ring-yellow-600/20',
}

function timeAgo(dateStr) {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

function parseValues(valuesJson) {
  if (!valuesJson) return null

  try {
    return JSON.stringify(JSON.parse(valuesJson), null, 2)
  } catch {
    return valuesJson
  }
}

export default function ExecutionsPage() {
  const [data, setData] = useState({ items: [], total: 0, page: 1, pageSize: 20 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [templateFilter, setTemplateFilter] = useState('')
  const [expanded, setExpanded] = useState(null)

  const load = () => {
    setLoading(true)
    setError(null)
    const filters = {}
    if (statusFilter) filters.status = statusFilter
    if (templateFilter.trim()) filters.templateName = templateFilter.trim()
    fetchExecutions(page, 20, filters)
      .then(setData)
      .catch((err) => setError(err))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [page, statusFilter, templateFilter])

  const totalPages = Math.ceil(data.total / data.pageSize)

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Executions</h1>
          <p className="mt-1 text-sm text-gray-500">History of all template executions</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={templateFilter}
            onChange={(e) => {
              setTemplateFilter(e.target.value)
              setPage(1)
            }}
            placeholder="Filter by template"
            className="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white"
          />
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value)
              setPage(1)
            }}
            className="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white"
          >
            <option value="">All statuses</option>
            <option value="success">Success</option>
            <option value="failed">Failed</option>
            <option value="pending">Pending</option>
          </select>
          <button
            onClick={load}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            title="Refresh"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error.message}
          {error.detail && <span className="block mt-1 text-red-500">{error.detail}</span>}
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
          </div>
        ) : data.items.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="font-medium">No executions yet</p>
            <p className="text-sm mt-1">Run a template from the catalog to see it here.</p>
          </div>
        ) : (
          <>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Template</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Output</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Commit</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">When</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data.items.map((exec) => (
                  <tr key={exec.id}>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset ${statusStyles[exec.status] || ''}`}>
                        {exec.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => setExpanded(expanded === exec.id ? null : exec.id)}
                        className="text-left"
                      >
                        <div className="text-sm font-medium text-gray-900">{exec.templateTitle || exec.templateName}</div>
                        <div className="text-xs text-gray-500">{exec.templateName}</div>
                      </button>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <span className="inline-flex items-center gap-1">
                        <span className={`w-2 h-2 rounded-full ${exec.outputTarget === 'github' ? 'bg-purple-400' : 'bg-blue-400'}`}></span>
                        {exec.outputTarget || 'local'}
                      </span>
                      {exec.outputRepo && (
                        <div className="text-xs text-gray-400 mt-0.5 font-mono">{exec.outputRepo}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {exec.commitSha ? (
                        exec.commitUrl ? (
                          <a href={exec.commitUrl} target="_blank" rel="noreferrer" className="text-xs font-mono text-indigo-600 hover:underline">
                            {exec.commitSha.substring(0, 8)}
                          </a>
                        ) : (
                          <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">{exec.commitSha.substring(0, 8)}</code>
                        )
                      ) : exec.status === 'failed' ? (
                        <span className="text-xs text-red-500">—</span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500" title={new Date(exec.executedAt).toLocaleString()}>
                      {timeAgo(exec.executedAt)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {exec.durationMs ? `${Math.round(exec.durationMs)}ms` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {expanded && (() => {
              const exec = data.items.find((item) => item.id === expanded)
              if (!exec) return null

              return (
                <div className="border-t border-gray-200 bg-gray-50 px-6 py-4">
                  <div className="grid grid-cols-2 gap-6">
                    {exec.valuesJson && (
                      <div>
                        <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">Input Values</h4>
                        <pre className="text-xs bg-white border border-gray-200 rounded-lg p-3 overflow-x-auto">
                          {parseValues(exec.valuesJson)}
                        </pre>
                      </div>
                    )}
                    <div>
                      {exec.filesCreated?.length > 0 && (
                        <div>
                          <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">Files Created</h4>
                          <ul className="space-y-0.5">
                            {exec.filesCreated.map((file) => (
                              <li key={file} className="text-xs font-mono text-gray-600">{file}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {exec.errorMessage && (
                        <div className="mt-3">
                          <h4 className="text-xs font-medium text-red-500 uppercase mb-2">Error</h4>
                          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{exec.errorMessage}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })()}

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200 bg-gray-50">
                <span className="text-sm text-gray-500">{data.total} total executions</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    disabled={page === 1}
                    className="px-3 py-1 text-sm border rounded-lg disabled:opacity-50 hover:bg-white transition-colors"
                  >
                    Previous
                  </button>
                  <span className="px-3 py-1 text-sm text-gray-500">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                    disabled={page === totalPages}
                    className="px-3 py-1 text-sm border rounded-lg disabled:opacity-50 hover:bg-white transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
