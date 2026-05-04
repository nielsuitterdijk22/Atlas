export default function FormField({ input, value, onChange, error }) {
  const baseInputClass =
    'block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm px-4 py-2.5 border bg-white'
  const errorClass = error ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''

  const renderField = () => {
    switch (input.type) {
      case 'select':
        return (
          <select
            value={value ?? input.default ?? ''}
            onChange={(e) => onChange(e.target.value)}
            className={`${baseInputClass} ${errorClass}`}
          >
            <option value="">Select...</option>
            {input.options?.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        )

      case 'boolean':
        return (
          <button
            type="button"
            role="switch"
            aria-checked={!!value}
            onClick={() => onChange(!value)}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
              value ? 'bg-indigo-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                value ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        )

      case 'number':
        return (
          <input
            type="number"
            value={value ?? input.default ?? ''}
            onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
            min={input.min}
            max={input.max}
            className={`${baseInputClass} ${errorClass}`}
            placeholder={input.description || ''}
          />
        )

      case 'multiline':
        return (
          <textarea
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
            rows={4}
            className={`${baseInputClass} ${errorClass}`}
            placeholder={input.description || ''}
          />
        )

      default:
        return (
          <input
            type="text"
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
            pattern={input.pattern}
            className={`${baseInputClass} ${errorClass}`}
            placeholder={input.description || ''}
          />
        )
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="block text-sm font-medium text-gray-700">
          {input.title}
          {input.required && <span className="text-red-500 ml-1">*</span>}
        </label>
        {input.type === 'boolean' && (
          <span className="text-xs text-gray-400">{value ? 'Enabled' : 'Disabled'}</span>
        )}
      </div>
      {input.description && input.type !== 'boolean' && input.type !== 'multiline' && (
        <p className="text-xs text-gray-400 mb-1.5">{input.description}</p>
      )}
      {renderField()}
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  )
}
