import { useState, useEffect } from 'react'
import { fetchPresets, createPreset, updatePreset, deletePreset } from '../../api'

const emptyPreset = {
  name: '',
  description: '',
  type: 'local',
  repo: '',
  branch: 'main',
  path: '/',
  commitMessageTemplate: '',
  gitHubTokenEnv: 'GITHUB_TOKEN',
}

export default function PresetsPage() {
  const [presets, setPresets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ ...emptyPreset })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState(null)

  const load = () => {
    setLoading(true)
    setError(null)
    fetchPresets()
      .then(setPresets)
      .catch((err) => setError(err))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const startCreate = () => {
    setForm({ ...emptyPreset })
    setEditing('new')
    setFormError(null)
  }

  const startEdit = (preset) => {
    setForm({ ...preset })
    setEditing(preset.id)
    setFormError(null)
  }

  const cancel = () => {
    setEditing(null)
    setFormError(null)
  }

  const handleSave = async () => {
    if (!form.name.trim() || !form.repo.trim()) {
      setFormError('Name and Repo are required')
      return
    }
    setSaving(true)
    setFormError(null)
    try {
      if (editing === 'new') {
        await createPreset(form)
      } else {
        await updatePreset(editing, form)
      }
      setEditing(null)
      load()
    } catch (err) {
      setFormError(err.detail || err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this preset?')) return
    try {
      await deletePreset(id)
      load()
    } catch (err) {
      setError(err)
    }
  }

  const updateField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }))

  const inputClass = 'block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500'

  if (editing !== null) {
    return (
      <div>
        <button onClick={cancel} className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-6">
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to presets
        </button>

        <div className="max-w-xl">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            {editing === 'new' ? 'Create Output Preset' : 'Edit Output Preset'}
          </h1>

          {formError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{formError}</div>
          )}

          <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="e.g. production-repo"
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input
                type="text"
                value={form.description || ''}
                onChange={(e) => updateField('description', e.target.value)}
                placeholder="Optional description"
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={form.type}
                onChange={(e) => updateField('type', e.target.value)}
                className={inputClass}
              >
                <option value="local">Local Git</option>
                <option value="github">GitHub API</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Repository</label>
              <input
                type="text"
                value={form.repo}
                onChange={(e) => updateField('repo', e.target.value)}
                placeholder={form.type === 'github' ? 'owner/repo-name' : '/path/to/repo'}
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
                <input
                  type="text"
                  value={form.branch}
                  onChange={(e) => updateField('branch', e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Path</label>
                <input
                  type="text"
                  value={form.path}
                  onChange={(e) => updateField('path', e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Commit Message Template</label>
              <input
                type="text"
                value={form.commitMessageTemplate || ''}
                onChange={(e) => updateField('commitMessageTemplate', e.target.value)}
                placeholder="e.g. feat: add {{app_name}}"
                className={inputClass}
              />
              <p className="mt-1 text-xs text-gray-400">Scriban syntax. Overrides the template's commit message if set.</p>
            </div>

            {form.type === 'github' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">GitHub Token Env Variable</label>
                <input
                  type="text"
                  value={form.gitHubTokenEnv || ''}
                  onChange={(e) => updateField('gitHubTokenEnv', e.target.value)}
                  placeholder="GITHUB_TOKEN"
                  className={inputClass}
                />
              </div>
            )}

            <div className="flex gap-3 pt-4 border-t border-gray-200">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Saving...' : editing === 'new' ? 'Create Preset' : 'Save Changes'}
              </button>
              <button
                onClick={cancel}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Output Presets</h1>
          <p className="mt-1 text-sm text-gray-500">
            Define reusable output configurations. Reference them in templates with <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">output.preset</code>.
          </p>
        </div>
        <button
          onClick={startCreate}
          className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Preset
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error.message}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
        </div>
      ) : presets.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
          <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <p className="font-medium text-gray-900">No presets yet</p>
          <p className="text-sm text-gray-500 mt-1">Create your first output preset to define where templates commit their output.</p>
          <button
            onClick={startCreate}
            className="mt-4 inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Create Preset
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {presets.map((preset) => (
            <div key={preset.id} className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-gray-900">{preset.name}</h3>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
                      preset.type === 'github'
                        ? 'bg-purple-50 text-purple-700 ring-purple-600/20'
                        : 'bg-blue-50 text-blue-700 ring-blue-600/20'
                    }`}>
                      {preset.type}
                    </span>
                  </div>
                  {preset.description && (
                    <p className="mt-1 text-xs text-gray-500">{preset.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => startEdit(preset)}
                    className="p-1.5 text-gray-400 hover:text-indigo-600 transition-colors"
                    title="Edit"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(preset.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
                    title="Delete"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="mt-3 space-y-1.5">
                <div className="flex items-center text-xs">
                  <span className="text-gray-400 w-16">Repo</span>
                  <span className="font-mono text-gray-600">{preset.repo}</span>
                </div>
                <div className="flex items-center text-xs">
                  <span className="text-gray-400 w-16">Branch</span>
                  <span className="text-gray-600">{preset.branch}</span>
                </div>
                {preset.commitMessageTemplate && (
                  <div className="flex items-center text-xs">
                    <span className="text-gray-400 w-16">Commit</span>
                    <span className="font-mono text-gray-600">{preset.commitMessageTemplate}</span>
                  </div>
                )}
              </div>
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-400">
                  Use in YAML: <code className="bg-gray-100 px-1 py-0.5 rounded">preset: {preset.name}</code>
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
