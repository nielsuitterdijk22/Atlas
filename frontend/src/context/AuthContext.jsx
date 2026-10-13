import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'

const ORG_KEY = 'yaly.activeOrg'

/** Active org id, readable outside React (api.js attaches it as the X-Yaly-Org header). */
export function getActiveOrgId() {
  return localStorage.getItem(ORG_KEY) || ''
}

// Fallback inactivity window used until /api/auth/me reports the server's value.
const DEFAULT_TIMEOUT_SECONDS = 30 * 60
const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart']

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [state, setState] = useState({ loading: true, user: null, memberships: [] })
  const [activeOrgId, setActiveOrgIdState] = useState(getActiveOrgId)
  const [sessionExpiresInSeconds, setSessionExpiresInSeconds] = useState(null)
  const timerRef = useRef(null)
  const signOutRef = useRef(null)

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  const armTimer = (seconds) => {
    clearTimer()
    const s = typeof seconds === 'number' && seconds > 0 ? seconds : DEFAULT_TIMEOUT_SECONDS
    timerRef.current = setTimeout(() => signOutRef.current?.(), s * 1000)
  }

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' })
      if (!res.ok) {
        clearTimer()
        setSessionExpiresInSeconds(null)
        setState({ loading: false, user: null, memberships: [] })
        return
      }
      const data = await res.json()
      setState({ loading: false, user: data.user, memberships: data.memberships })
      setSessionExpiresInSeconds(data.session?.expiresInSeconds ?? null)
      armTimer(data.session?.expiresInSeconds)

      // Keep the active org valid against the latest membership list.
      const stored = getActiveOrgId()
      const valid = data.memberships.some((m) => m.orgId === stored)
      const next = valid ? stored : data.memberships[0]?.orgId || ''
      localStorage.setItem(ORG_KEY, next)
      setActiveOrgIdState(next)
    } catch {
      clearTimer()
      setSessionExpiresInSeconds(null)
      setState({ loading: false, user: null, memberships: [] })
    }
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => () => clearTimer(), [])

  const setActiveOrg = (orgId) => {
    localStorage.setItem(ORG_KEY, orgId)
    setActiveOrgIdState(orgId)
  }

  const signOut = async () => {
    clearTimer()
    setSessionExpiresInSeconds(null)
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    } finally {
      localStorage.removeItem(ORG_KEY)
      setState({ loading: false, user: null, memberships: [] })
      setActiveOrgIdState('')
      window.location.href = '/'
    }
  }
  signOutRef.current = signOut

  const onActivity = () => {
    if (state.user) armTimer(sessionExpiresInSeconds)
  }

  useEffect(() => {
    if (!state.user) return undefined
    ACTIVITY_EVENTS.forEach((event) => window.addEventListener(event, onActivity, { passive: true }))
    return () => ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, onActivity))
  }, [state.user, sessionExpiresInSeconds])

  const activeOrg = state.memberships.find((m) => m.orgId === activeOrgId) || null

  return (
    <AuthContext.Provider
      value={{
        ...state,
        activeOrg,
        activeOrgId,
        setActiveOrg,
        signOut,
        refresh: load,
        sessionExpiresInSeconds,
      }}
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
