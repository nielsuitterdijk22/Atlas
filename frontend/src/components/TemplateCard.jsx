import { Link } from 'react-router-dom'

const icons = {
  rocket: '🚀',
  settings: '⚙️',
  database: '🗄️',
  code: '💻',
  file: '📄',
  cloud: '☁️',
  shield: '🛡️',
  globe: '🌐',
  key: '🔑',
}

export default function TemplateCard({ template }) {
  const { metadata, spec } = template
  const icon = icons[metadata.icon] || icons.file
  const needsApproval = spec.approvalRequired

  return (
    <Link
      to={`/create/${metadata.name}`}
      className="group block bg-white rounded-xl border border-gray-200 p-6 hover:border-indigo-300 hover:shadow-lg transition-all duration-200"
    >
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-2xl group-hover:bg-indigo-100 transition-colors">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
              {metadata.title}
            </h3>
            {needsApproval && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                needs approval
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-gray-500 line-clamp-2">
            {metadata.description}
          </p>
          <div className="mt-3 flex items-center gap-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
              {metadata.serviceType || 'Service'}
            </span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
              {spec.inputs.length} {spec.inputs.length === 1 ? 'input' : 'inputs'}
            </span>
          </div>
        </div>
        <svg className="w-5 h-5 text-gray-400 group-hover:text-indigo-500 transition-colors mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </Link>
  )
}
