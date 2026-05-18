import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import {
  fetchOrganization, updateOrganization, syncCatalog,
  inviteMember, updateMember, removeMember,
} from '../api'
import { useAuth, useIsPlatformEngineer } from '../context/AuthContext'
import { Page, PageHeader, Spinner, ErrorState } from '../components/ui'

function timeAgo(iso) {
  if (!iso) return 'never'
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hrs = Math.round(mins / 60)
  return hrs < 24 ? `${hrs} h ago` : `${Math.round(hrs / 24)} d ago`
}

export default function OrgSettingsPage() {
  const { activeOrg, refresh } = useAuth()
  const isPlatformEngineer = useIsPlatformEngineer()
  const orgId = activeOrg?.orgId

  const [org, setOrg] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [repoUrl, setRepoUrl] = useState('')
  const [branch, setBranch] = useState('main')
  const [token, setToken] = useState('')
  const [busy, setBusy] = useState(null)
  const [notice, setNotice] = useState(null)
  const [invite, setInvite] = useState({ gitHubLogin: '', role: 'developer' })

  const load = () => {
    if (!orgId) { setLoading(false); return }
    setLoading(true)
    setError(null)
    fetchOrganization(orgId)
      .then((o) => {
        setOrg(o)
        setRepoUrl(o.catalogRepoUrl || '')
        setBranch(o.catalogBranch || 'main')
      })
      .catch(setError)
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [orgId])

  if (!isPlatformEngineer) return <Navigate to="/" replace />

  const act = async (key, fn, successMsg) => {
    setBusy(key)
    setNotice(null)
    setError(null)
    try {
      await fn()
      if (successMsg) setNotice(successMsg)
      load()
      refresh()
    } catch (err) {
      setError(err)
    } finally {
      setBusy(null)
    }
  }

  return (
    <Page>
      <PageHeader
        kicker="Governance"
        title="Organization settings"
        description={`Manage ${activeOrg?.orgName || 'your organization'}'s catalog and members.`}
      />

      {loading && <Spinner />}
      {error && <ErrorState error={error} onRetry={load} />}
      {notice && (
        <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700">
          {notice}
        </div>
      )}

      {!loading && org && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="text-sm font-semibold text-gray-900 mb-1">Template catalog</div>
            <p className="text-xs text-gray-500 mb-4">
              Connect a Git repository holding your <code>form.yaml</code> templates. Yaly
              clones it on sync. Last synced: <strong>{timeAgo(org.lastCatalogSyncAt)}</strong>.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="https://github.com/org/templates.git"
                className="md:col-span-2 px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <input
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                placeholder="main"
                className="px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="mt-3">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Access token (for private repositories)
              </label>
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder={org.hasCatalogToken ? '•••••••• token set — type to replace' : 'GitHub token with repo read access'}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-xs text-gray-400 mt-1">
                Stored encrypted; never shown again. Leave blank to keep the current token
                {org.hasCatalogToken ? '' : ' (public repos need none)'}.
              </p>
            </div>
            <div className="flex gap-2 mt-3">
              <button
                disabled={busy != null}
                onClick={() => act('save', async () => {
                  const body = { catalogRepoUrl: repoUrl, catalogBranch: branch }
                  if (token) body.catalogRepoToken = token
                  await updateOrganization(orgId, body)
                  setToken('')
                }, 'Catalog repository saved.')}
                className="px-4 py-2 bg-white border border-gray-300 text-sm font-semibold text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Save
              </button>
              <button
                disabled={busy != null}
                onClick={() => act('sync', () => syncCatalog(orgId), 'Catalog synced.')}
                className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {busy === 'sync' ? 'Syncing…' : 'Sync now'}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="text-sm font-semibold text-gray-900 mb-3">Members</div>
            <div className="rounded-lg border border-gray-200 overflow-hidden mb-4">
              {(org.members || []).map((m) => (
                <div key={m.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-100 last:border-0 text-sm">
                  <span className="font-mono text-gray-900">{m.gitHubLogin}</span>
                  {m.status === 'pending' && (
                    <span className="text-[11px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                      invited
                    </span>
                  )}
                  <select
                    value={m.role}
                    onChange={(e) => act(`role-${m.id}`, () => updateMember(orgId, m.id, e.target.value))}
                    disabled={busy != null}
                    className="ml-auto text-sm border border-gray-300 rounded-lg px-2 py-1 bg-white"
                  >
                    <option value="developer">Developer</option>
                    <option value="platform-engineer">Platform Engineer</option>
                  </select>
                  <button
                    disabled={busy != null}
                    onClick={() => act(`rm-${m.id}`, () => removeMember(orgId, m.id))}
                    className="text-sm text-red-600 hover:text-red-700 disabled:opacity-50"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={invite.gitHubLogin}
                onChange={(e) => setInvite({ ...invite, gitHubLogin: e.target.value })}
                placeholder="GitHub username to invite"
                className="flex-1 px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <select
                value={invite.role}
                onChange={(e) => setInvite({ ...invite, role: e.target.value })}
                className="text-sm border border-gray-300 rounded-lg px-2 py-2 bg-white"
              >
                <option value="developer">Developer</option>
                <option value="platform-engineer">Platform Engineer</option>
              </select>
              <button
                disabled={busy != null || !invite.gitHubLogin.trim()}
                onClick={() => act('invite',
                  () => inviteMember(orgId, invite.gitHubLogin.trim(), invite.role),
                  `Invited ${invite.gitHubLogin.trim()}.`)
                  .then(() => setInvite({ gitHubLogin: '', role: 'developer' }))}
                className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                Invite
              </button>
            </div>
          </div>
        </div>
      )}
    </Page>
  )
}
