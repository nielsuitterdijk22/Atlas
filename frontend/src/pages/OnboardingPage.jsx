import { useState } from 'react'
import { createOrganization } from '../api'
import { useAuth } from '../context/AuthContext'

export default function OnboardingPage() {
  const { user, refresh, setActiveOrg, signOut } = useAuth()
  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const submit = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      const org = await createOrganization(name.trim())
      setActiveOrg(org.id)
      await refresh()
    } catch (err) {
      setError(err.detail || err.message)
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl border border-gray-200 p-8">
          <h1 className="text-2xl font-bold text-gray-900">Create your organization</h1>
          <p className="mt-2 text-sm text-gray-500">
            Welcome, {user?.displayName}. An organization is your team's workspace — its
            own catalog, services and requests. You'll be its first platform engineer.
          </p>
          <form onSubmit={submit} className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Organization name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Acme Platform Team"
              className="block w-full rounded-lg border border-gray-300 text-sm px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={submitting || !name.trim()}
              className="mt-5 w-full px-4 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {submitting ? 'Creating…' : 'Create organization'}
            </button>
          </form>
        </div>
        <button
          onClick={signOut}
          className="mt-4 w-full text-center text-sm text-gray-400 hover:text-gray-600"
        >
          Sign out
        </button>
      </div>
    </div>
  )
}
