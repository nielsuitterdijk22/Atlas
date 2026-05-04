import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { fetchTemplate, executeTemplate } from '../api'
import FormField from '../components/FormField'

export default function TemplatePage() {
  const { name } = useParams()
  const [template, setTemplate] = useState(null)
  const [loading, setLoading] = useState(true)
  const [values, setValues] = useState({})
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)

  useEffect(() => {
    fetchTemplate(name)
      .then((t) => {
        setTemplate(t)
        const defaults = {}
        t.spec.inputs.forEach((input) => {
          if (input.default !== undefined && input.default !== null) {
            defaults[input.id] = input.default
          }
        })
        setValues(defaults)
      })
      .catch(() => setTemplate(null))
      .finally(() => setLoading(false))
  }, [name])

  const validate = () => {
    const newErrors = {}
    template.spec.inputs.forEach((input) => {
      const val = values[input.id]
      if (input.required && (val === undefined || val === null || val === '')) {
        newErrors[input.id] = 'This field is required'
      }
      if (input.pattern && val && !new RegExp(input.pattern).test(val)) {
        newErrors[input.id] = `Must match pattern: ${input.pattern}`
      }
      if (input.type === 'number' && val !== undefined && val !== '') {
        if (input.min !== undefined && val < input.min) {
          newErrors[input.id] = `Minimum value is ${input.min}`
        }
        if (input.max !== undefined && val > input.max) {
          newErrors[input.id] = `Maximum value is ${input.max}`
        }
      }
    })
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return

    setSubmitting(true)
    setResult(null)
    try {
      const res = await executeTemplate(name, values)
      setResult(res)
    } catch (err) {
      setResult({ success: false, message: err.detail || err.message })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (!template) {
    return (
      <div className="text-center py-20">
        <h2 className="text-lg font-semibold text-gray-900">Template not found</h2>
        <Link to="/" className="mt-2 text-indigo-600 hover:text-indigo-500 text-sm">
          ← Back to catalog
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Link to="/" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-6">
        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to catalog
      </Link>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900">{template.metadata.title}</h1>
          <p className="mt-1 text-sm text-gray-500">{template.metadata.description}</p>
        </div>

        {result ? (
          <div className="p-6">
            {result.success ? (
              <div className="rounded-lg bg-green-50 border border-green-200 p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-xl">✅</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-green-800">Success!</h3>
                    <p className="text-sm text-green-600">{result.message}</p>
                  </div>
                </div>
                {result.commitSha && (
                  <div className="mt-4 bg-white rounded-lg border border-green-200 p-4">
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Commit:</span>{' '}
                      {result.commitUrl ? (
                        <a href={result.commitUrl} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline font-mono text-xs">
                          {result.commitSha.substring(0, 8)}
                        </a>
                      ) : (
                        <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{result.commitSha.substring(0, 8)}</code>
                      )}
                    </p>
                    {result.filesCreated?.length > 0 && (
                      <div className="mt-2">
                        <p className="text-sm font-medium text-gray-600">Files created:</p>
                        <ul className="mt-1 space-y-0.5">
                          {result.filesCreated.map((f) => (
                            <li key={f} className="text-xs font-mono text-gray-500">
                              {f}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
                <div className="mt-4 flex gap-3">
                  <button
                    onClick={() => {
                      setResult(null)
                      setValues({})
                    }}
                    className="text-sm text-green-700 hover:text-green-800 font-medium"
                  >
                    Run again
                  </button>
                  <Link to="/" className="text-sm text-gray-500 hover:text-gray-700">
                    Back to catalog
                  </Link>
                </div>
              </div>
            ) : (
              <div className="rounded-lg bg-red-50 border border-red-200 p-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                    <span className="text-xl">❌</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-red-800">Failed</h3>
                    <p className="text-sm text-red-600">{result.message}</p>
                  </div>
                </div>
                <button
                  onClick={() => setResult(null)}
                  className="mt-4 text-sm text-red-700 hover:text-red-800 font-medium"
                >
                  Try again
                </button>
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {template.spec.inputs.map((input) => (
              <FormField
                key={input.id}
                input={input}
                value={values[input.id]}
                onChange={(val) => setValues((prev) => ({ ...prev, [input.id]: val }))}
                error={errors[input.id]}
              />
            ))}

            <div className="pt-4 border-t border-gray-200">
              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Executing...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Execute Template
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
