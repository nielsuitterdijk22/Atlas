import { NavLink } from 'react-router-dom'
import { useAuth, useIsPlatformEngineer } from '../context/AuthContext'

const icons = {
  home: 'M2.25 12l8.954-8.955a1.5 1.5 0 012.122 0L21 12M4.5 9.75v9.75A.75.75 0 005.25 21h3.75v-6h6v6h3.75a.75.75 0 00.75-.75V9.75',
  catalog: 'M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5',
  create: 'M12 4.5v15m7.5-7.5h-15',
  requests: 'M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z',
  approvals: 'M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  settings: 'M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z',
  admin: 'M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6',
}

function Icon({ path }) {
  return (
    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d={path} />
    </svg>
  )
}

function NavItem({ to, icon, label, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
          isActive
            ? 'bg-indigo-600 text-white font-semibold'
            : 'text-slate-300 hover:bg-slate-700/60 hover:text-white'
        }`
      }
    >
      <Icon path={icons[icon]} />
      {label}
    </NavLink>
  )
}

function SectionLabel({ children }) {
  return (
    <div className="px-3 pt-5 pb-2 text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
      {children}
    </div>
  )
}

export default function Sidebar() {
  const { user, memberships, activeOrgId, setActiveOrg, signOut } = useAuth()
  const isPlatformEngineer = useIsPlatformEngineer()

  return (
    <aside className="w-64 shrink-0 bg-slate-900 flex flex-col h-screen sticky top-0">
      <div className="flex items-center gap-2.5 px-5 h-16 border-b border-slate-700/60">
        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-sm">Y</span>
        </div>
        <div>
          <div className="text-white font-semibold leading-tight">Yaly</div>
          <div className="text-[10px] text-slate-500 tracking-wider uppercase">Developer Portal</div>
        </div>
      </div>

      {/* Organization switcher */}
      <div className="px-3 pt-3">
        <label className="block text-[10px] text-slate-500 tracking-wider uppercase mb-1.5 px-1">
          Organization
        </label>
        <select
          value={activeOrgId}
          onChange={(e) => setActiveOrg(e.target.value)}
          className="w-full bg-slate-800 text-slate-100 text-sm rounded-lg border border-slate-700 px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {memberships.map((m) => (
            <option key={m.orgId} value={m.orgId}>{m.orgName}</option>
          ))}
        </select>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-2">
        <SectionLabel>Workspace</SectionLabel>
        <div className="space-y-1">
          <NavItem to="/" icon="home" label="Home" end />
          <NavItem to="/catalog" icon="catalog" label="Catalog" />
          <NavItem to="/create" icon="create" label="Create" />
          <NavItem to="/requests" icon="requests" label="My Requests" />
        </div>

        {isPlatformEngineer && (
          <>
            <SectionLabel>Governance</SectionLabel>
            <div className="space-y-1">
              <NavItem to="/approvals" icon="approvals" label="Approvals" />
              <NavItem to="/settings/organization" icon="settings" label="Org Settings" />
              <NavItem to="/admin" icon="admin" label="Admin" />
            </div>
          </>
        )}
      </nav>

      <div className="border-t border-slate-700/60 p-3 flex items-center gap-2.5">
        {user?.avatarUrl ? (
          <img src={user.avatarUrl} alt="" className="w-8 h-8 rounded-full" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 text-xs font-semibold">
            {(user?.displayName || '?').charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="text-sm text-white font-medium truncate">{user?.displayName}</div>
          <div className="text-[11px] text-slate-500 truncate">@{user?.gitHubLogin}</div>
        </div>
        <button
          onClick={signOut}
          title="Sign out"
          className="text-slate-400 hover:text-white p-1"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7}
              d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
          </svg>
        </button>
      </div>
    </aside>
  )
}
