import { useState, useEffect, useMemo } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { fetchTemplate, createRequest } from '../api'
import { useAuth } from '../context/AuthContext'
import { TEAMS } from '../constants'
import FormField from '../components/FormField'
import { Page, Spinner, ErrorState } from '../components/ui'

const STEPS = ['Basics', 'Configure', 'Review & launch']

/** Mirrors RequestsController.ResolveNameInput on the backend. */
function resolveNameInput(spec) {
  if (spec.nameInput) return spec.nameInput
  if (spec.inputs.some((i) => i.id === 'name')) return 'name'
  if (spec.inputs.some((i) => i.id === 'service_name')) return 'service_name'
  return spec.inputs.find((i) => i.required && i.type === 'string')?.id || null
}

function Stepper({ step }) {
  return (
    <div className="flex items-center gap-2 mb-7">
      {STEPS.map((label, i) => (
        <div key={label} className="flex items-center gap-2 flex-1 last:flex-none">
          <div
            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
              i <= step ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-400'
            }`}
          >
            {i < step ? '✓' : i + 1}
          </div>
          <span className={`text-sm ${i === step ? 'font-semibold text-gray-900' : 'text-gray-400'}`}>
            {label}
          </span>
          {i < STEPS.length - 1 && <div className="flex-1 h-px bg-gray-200" />}
        </div>
      ))}
    </div>
  )
}

export default function WizardPage() {
  const { name } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [template, setTemplate] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)

  const [step, setStep] = useState(0)
  const [basics, setBasics] = useState({ name: '', team: TEAMS[0], owner: user.gitHubLogin })
  const [values, setValues] = useState({})
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  useEffect(() => {
    setLoading(true)
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
      .catch(setLoadError)
      .finally(() => setLoading(false))
  }, [name])

  const nameInputId = useMemo(
    () => (template ? resolveNameInput(template.spec) : null),
    [template]
  )

  // Configure step renders every input except the ones the Basics step owns.
  const configureInputs = useMemo(() => {
    if (!template) return []
    const hidden = new Set([nameInputId, 'owner', 'team'])
    return template.spec.inputs.filter((i) => !hidden.has(i.id))
  }, [template, nameInputId])

  if (loading) return <Page><Spinner /></Page>
  if (loadError) {
    return (
      <Page>
        <ErrorState error={loadError} />
        <Link to="/create" className="text-indigo-600 text-sm">← Back to templates</Link>
      </Page>
    )
  }

  const { metadata, spec } = template
  const needsApproval = spec.approvalRequired

  const validateConfigure = () => {
    const next = {}
    configureInputs.forEach((input) => {
      const val = values[input.id]
      if (input.required && (val === undefined || val === null || val === '')) {
        next[input.id] = 'This field is required'
      }
      if (input.pattern && val && !new RegExp(input.pattern).test(val)) {
        next[input.id] = `Must match pattern: ${input.pattern}`
      }
      if (input.type === 'number' && val !== undefined && val !== '') {
        if (input.min !== undefined && val < input.min) next[input.id] = `Minimum value is ${input.min}`
        if (input.max !== undefined && val > input.max) next[input.id] = `Maximum value is ${input.max}`
      }
    })
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const basicsValid = basics.name.trim().length > 1 && basics.team && basics.owner.trim()

  const next = () => {
    if (step === 1 && !validateConfigure()) return
    setStep((s) => Math.min(s + 1, STEPS.length - 1))
  }
  const back = () => setStep((s) => Math.max(s - 1, 0))

  const submit = async () => {
    setSubmitting(true)
    setSubmitError(null)
    try {
      const req = await createRequest({
        templateName: metadata.name,
        name: basics.name.trim(),
        team: basics.team,
        owner: basics.owner.trim(),
        values,
      })
      navigate(`/requests/${req.id}`)
    } catch (err) {
      setSubmitError(err)
      setSubmitting(false)
    }
  }

  const reviewRows = [
    ['Template', metadata.title],
    ['Service name', basics.name],
    ['Team', basics.team],
    ['Owner', basics.owner],
    ...configureInputs.map((i) => [i.title, String(values[i.id] ?? '—')]),
  ]

  return (
    <Page>
      <Link to="/create" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-5">
        ← Back to templates
      </Link>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">New {metadata.title}</h1>
      <p className="text-sm text-gray-500 mb-6">{metadata.description}</p>

      <Stepper step={step} />

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        {step === 0 && (
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Service name <span className="text-red-500">*</span></label>
              <p className="text-xs text-gray-400 mb-1.5">Lowercase, hyphenated. Drives the repo and resource naming.</p>
              <input
                value={basics.name}
                onChange={(e) => setBasics({ ...basics, name: e.target.value })}
                placeholder="e.g. fraud-scoring-api"
                className="block w-full rounded-lg border border-gray-300 text-sm px-4 py-2.5 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Owning team <span className="text-red-500">*</span></label>
                <select
                  value={basics.team}
                  onChange={(e) => setBasics({ ...basics, team: e.target.value })}
                  className="block w-full rounded-lg border border-gray-300 text-sm px-4 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {TEAMS.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Owner <span className="text-red-500">*</span></label>
                <input
                  value={basics.owner}
                  onChange={(e) => setBasics({ ...basics, owner: e.target.value })}
                  className="block w-full rounded-lg border border-gray-300 text-sm px-4 py-2.5 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-6">
            {configureInputs.length === 0 && (
              <p className="text-sm text-gray-400">
                This template has no extra configuration — continue to review.
              </p>
            )}
            {configureInputs.map((input) => (
              <FormField
                key={input.id}
                input={input}
                value={values[input.id]}
                onChange={(val) => setValues((prev) => ({ ...prev, [input.id]: val }))}
                error={errors[input.id]}
              />
            ))}
          </div>
        )}

        {step === 2 && (
          <div>
            {needsApproval && (
              <div className="flex items-start gap-2.5 p-3.5 rounded-lg mb-5 bg-amber-50 border border-amber-200">
                <span>⚠️</span>
                <span className="text-sm text-amber-800">
                  This template needs <strong>platform-team approval</strong>. The request will be queued for review before provisioning starts.
                </span>
              </div>
            )}
            <div className="text-sm font-semibold text-gray-900 mb-2">Provisioning plan</div>
            <div className="rounded-lg border border-gray-200 overflow-hidden">
              {reviewRows.map(([k, v], i) => (
                <div key={k} className={`flex justify-between px-4 py-2.5 text-sm ${i % 2 ? 'bg-gray-50' : 'bg-white'}`}>
                  <span className="text-gray-500">{k}</span>
                  <span className="font-mono text-gray-900">{v}</span>
                </div>
              ))}
            </div>
            {submitError && (
              <p className="mt-4 text-sm text-red-600">
                {submitError.detail || submitError.message}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-between mt-5">
        <button
          onClick={step === 0 ? () => navigate('/create') : back}
          className="px-4 py-2.5 text-sm font-semibold text-gray-600 hover:text-gray-900"
        >
          {step === 0 ? 'Cancel' : '← Back'}
        </button>
        {step < 2 ? (
          <button
            onClick={next}
            disabled={step === 0 && !basicsValid}
            className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Continue →
          </button>
        ) : (
          <button
            onClick={submit}
            disabled={submitting}
            className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {submitting ? 'Submitting…' : needsApproval ? 'Submit for approval' : 'Launch'}
          </button>
        )}
      </div>
    </Page>
  )
}
