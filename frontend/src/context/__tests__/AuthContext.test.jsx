import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { AuthProvider, useAuth } from '../AuthContext'

function Probe() {
  const { user, signOut, sessionExpiresInSeconds } = useAuth()
  return (
    <div>
      <span data-testid="user">{user ? user.displayName : 'anonymous'}</span>
      <span data-testid="expires">{sessionExpiresInSeconds ?? 'n/a'}</span>
      <button onClick={() => signOut()}>sign-out</button>
    </div>
  )
}

function okMe() {
  return {
    ok: true,
    json: async () => ({
      user: { id: 'u1', displayName: 'Ada', email: 'ada@example.com' },
      memberships: [],
      session: { id: 's1', expiresInSeconds: 1800 },
    }),
  }
}

describe('AuthContext session + logout', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.stubGlobal('fetch', vi.fn())
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('loads the current user and session expiry from /api/auth/me', async () => {
    fetch.mockResolvedValue(okMe())
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )
    await act(async () {})
    expect(await screen.findByTestId('user')).toHaveTextContent('Ada')
    expect(screen.getByTestId('expires')).toHaveTextContent('1800')
  })

  it('sign-out calls the backend logout, clears local state, and redirects to login', async () => {
    fetch.mockImplementation((url, opts) => {
      if (String(url).includes('/api/auth/me')) return Promise.resolve(okMe())
      if (String(url).includes('/api/auth/logout')) {
        return Promise.resolve({ ok: true, status: 204, json: async () => ({}) })
      }
      return Promise.resolve({ ok: true, json: async () => ({}) })
    })

    const hrefSpy = vi.spyOn(window.location, 'assign').mockImplementation(() => {})
    let originalHref
    Object.defineProperty(window.location, 'href', {
      configurable: true,
      get: () => originalHref ?? 'http://localhost/portal',
      set: (v) => {
        originalHref = v
        hrefSpy(v)
      },
    })

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )
    await act(async () {})
    expect(screen.getByTestId('user')).toHaveTextContent('Ada')

    await act(async () => {
      fireEvent.click(screen.getByText('sign-out'))
    })

    const logoutCall = fetch.mock.calls.find(([url]) => String(url).includes('/api/auth/logout'))
    expect(logoutCall).toBeDefined()
    expect(logoutCall[1]).toMatchObject({ method: 'POST', credentials: 'include' })
    expect(window.localStorage.getItem('yaly.activeOrg')).toBeNull()
    expect(originalHref).toBe('http://localhost/')
  })

  it('sign-out still redirects to login even when the backend call fails', async () => {
    fetch.mockImplementation((url) => {
      if (String(url).includes('/api/auth/me')) return Promise.resolve(okMe())
      return Promise.resolve({ ok: false, status: 500, json: async () => ({}) })
    })

    let originalHref
    Object.defineProperty(window.location, 'href', {
      configurable: true,
      get: () => originalHref ?? 'http://localhost/portal',
      set: (v) => {
        originalHref = v
      },
    })

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )
    await act(async () {})

    await act(async () => {
      fireEvent.click(screen.getByText('sign-out'))
    })

    expect(originalHref).toBe('http://localhost/')
  })

  it('expires the session client-side after the inactivity timeout and logs out', async () => {
    fetch.mockImplementation((url) => {
      if (String(url).includes('/api/auth/me')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            user: { id: 'u1', displayName: 'Ada' },
            memberships: [],
            session: { id: 's1', expiresInSeconds: 10 },
          }),
        })
      }
      if (String(url).includes('/api/auth/logout')) {
        return Promise.resolve({ ok: true, status: 204, json: async () => ({}) })
      }
      return Promise.resolve({ ok: true, json: async () => ({}) })
    })

    let originalHref
    Object.defineProperty(window.location, 'href', {
      configurable: true,
      get: () => originalHref ?? 'http://localhost/portal',
      set: (v) => {
        originalHref = v
      },
    })

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )
    await act(async () {})
    expect(screen.getByTestId('user')).toHaveTextContent('Ada')

    // 10s of inactivity elapses -> auto sign-out.
    await act(async () => {
      vi.advanceTimersByTime(11_000)
    })

    const logoutCall = fetch.mock.calls.find(([url]) => String(url).includes('/api/auth/logout'))
    expect(logoutCall).toBeDefined()
    expect(originalHref).toBe('http://localhost/')
  })

  it('activity resets the inactivity clock', async () => {
    fetch.mockImplementation((url) => {
      if (String(url).includes('/api/auth/me')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            user: { id: 'u1', displayName: 'Ada' },
            memberships: [],
            session: { id: 's1', expiresInSeconds: 10 },
          }),
        })
      }
      if (String(url).includes('/api/auth/logout')) {
        return Promise.resolve({ ok: true, status: 204, json: async () => ({}) })
      }
      return Promise.resolve({ ok: true, json: async () => ({}) })
    })

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )
    await act(async () {})

    // 9s idle, then activity, then 9s more: 18s total but never 10s idle.
    await act(async () => {
      vi.advanceTimersByTime(9_000)
    })
    act(() => {
      fireEvent.mouseMove(document.body)
    })
    await act(async () => {
      vi.advanceTimersByTime(9_000)
    })

    const logoutCall = fetch.mock.calls.find(([url]) => String(url).includes('/api/auth/logout'))
    expect(logoutCall).toBeUndefined()
    expect(screen.getByTestId('user')).toHaveTextContent('Ada')
  })
})
