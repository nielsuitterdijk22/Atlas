import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const ORG_KEY = 'yaly.activeOrg'

/** Active org id, readable outside React (api.js attaches it as the X-Yaly-Org header). */
export function getActiveOrgId() {
  return localStorage.getItem(ORG_KEY) || ''
}

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [state, setState] = useState({ loading: true, user: null, memberships: [] })
  const [activeOrgId, setActiveOrgIdState] = useState(getActiveOrgId)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' })
      if (!res.ok) {
        setState({ loading: false, user: null, memberships: [] })
        return
      }
      const data = await res.json()
      setState({ loading: false, user: data.user, memberships: data.memberships })

      // Keep the active org valid against the latest membership list.
      const stored = getActiveOrgId()
      const valid = data.memberships.some((m) => m.orgId === stored)
      const next = valid ? stored : data.memberships[0]?.orgId || ''
      localStorage.setItem(ORG_KEY, next)
      setActiveOrgIdState(next)
    } catch {
      setState({ loading: false, user: null, memberships: [] })
    }
  }, [])

  useEffect(() => { load() }, [load])

  const setActiveOrg = (orgId) => {
    localStorage.setItem(ORG_KEY, orgId)
    setActiveOrgIdState(orgId)
  }

  const signOut = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    } finally {
      localStorage.removeItem(ORG_KEY)
      window.location.href = '/'
    }
  }

  const activeOrg = state.memberships.find((m) => m.orgId === activeOrgId) || null

  return (
    <AuthContext.Provider
      value={{ ...state, activeOrg, activeOrgId, setActiveOrg, signOut, refresh: load }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}

/** True when the active membership grants the platform-engineer role. */
export function useIsPlatformEngineer() {
  return useAuth().activeOrg?.role === 'platform-engineer'
}
