import { Link } from 'react-router-dom'

/** Standard padded content container for non-admin pages. */
export function Page({ children }) {
  return (
    <main className="flex-1 overflow-y-auto">
      <div className="max-w-6xl mx-auto w-full px-8 py-8">{children}</div>
    </main>
  )
}

export function PageHeader({ kicker, title, description, action }) {
  return (
    <div className="flex items-start justify-between mb-7 gap-4">
      <div>
        {kicker && (
          <div className="text-xs font-semibold tracking-wider text-indigo-600 uppercase mb-1.5">
            {kicker}
          </div>
        )}
        <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
        {description && (
          <p className="mt-2 text-gray-500 max-w-2xl">{description}</p>
        )}
      </div>
      {action}
    </div>
  )
}

export function Spinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
    </div>
  )
}

export function ErrorState({ error, onRetry }) {
  return (
    <div className="text-center py-20">
      <h2 className="text-lg font-semibold text-gray-900">
        {error?.message || 'Something went wrong'}
      </h2>
      {error?.detail && (
        <p className="mt-1 text-sm text-gray-500 max-w-md mx-auto">{error.detail}</p>
      )}
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700"
        >
          Retry
        </button>
      )}
    </div>
  )
}

export function EmptyState({ icon = '📭', title, description, action }) {
  return (
    <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
      <div className="text-3xl mb-3">{icon}</div>
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

const STATUS_STYLES = {
  'pending-approval': { label: 'Awaiting approval', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  provisioning: { label: 'Provisioning', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  completed: { label: 'Completed', cls: 'bg-green-50 text-green-700 border-green-200' },
  failed: { label: 'Failed', cls: 'bg-red-50 text-red-700 border-red-200' },
  rejected: { label: 'Rejected', cls: 'bg-gray-100 text-gray-600 border-gray-200' },
}

export function StatusBadge({ status }) {
  const meta = STATUS_STYLES[status] || { label: status, cls: 'bg-gray-100 text-gray-600 border-gray-200' }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${meta.cls}`}>
      {meta.label}
    </span>
  )
}

export const LIFECYCLE_STYLES = {
  production: 'bg-green-50 text-green-700 border-green-200',
  staging: 'bg-amber-50 text-amber-700 border-amber-200',
  development: 'bg-blue-50 text-blue-700 border-blue-200',
  experimental: 'bg-gray-100 text-gray-600 border-gray-200',
}

export function LifecycleBadge({ lifecycle }) {
  const cls = LIFECYCLE_STYLES[lifecycle] || 'bg-gray-100 text-gray-600 border-gray-200'
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
      {lifecycle}
    </span>
  )
}

export function Pagination({ page, totalPages, total, noun = 'items', onPage }) {
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center justify-between mt-5">
      <span className="text-sm text-gray-500">{total} {noun}</span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white disabled:opacity-50 hover:bg-gray-50"
        >
          Previous
        </button>
        <span className="px-2 text-sm text-gray-500">Page {page} of {totalPages}</span>
        <button
          onClick={() => onPage(page + 1)}
          disabled={page >= totalPages}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white disabled:opacity-50 hover:bg-gray-50"
        >
          Next
        </button>
      </div>
    </div>
  )
}

export function PrimaryLink({ to, children }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
    >
      {children}
    </Link>
  )
}
