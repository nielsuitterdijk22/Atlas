import { getActiveOrgId } from './context/AuthContext'

const API_BASE = '/api'

class ApiError extends Error {
  constructor(message, status, detail) {
    super(message)
    this.status = status
    this.detail = detail
  }
}

async function request(url, options = {}) {
  const orgId = getActiveOrgId()
  const headers = { ...(options.headers || {}) }
  if (orgId) headers['X-Yaly-Org'] = orgId

  let res
  try {
    res = await fetch(url, { ...options, credentials: 'include', headers })
  } catch (err) {
    throw new ApiError(
      'Could not reach the API server. Is the backend running?',
      0,
      err.message
    )
  }

  if (!res.ok) {
    let detail = ''
    try {
      const body = await res.json()
      detail = body.error || body.message || JSON.stringify(body)
    } catch {
      detail = res.statusText
    }
    throw new ApiError(`Request failed (${res.status})`, res.status, detail)
  }

  if (res.status === 204) return null
  return res.json()
}

function jsonBody(url, body, method = 'POST') {
  return request(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

// --- Auth & organizations ---

export function fetchOrganizations() {
  return request(`${API_BASE}/orgs`)
}

export function fetchOrganization(id) {
  return request(`${API_BASE}/orgs/${id}`)
}

export function createOrganization(name) {
  return jsonBody(`${API_BASE}/orgs`, { name })
}

export function updateOrganization(id, body) {
  return jsonBody(`${API_BASE}/orgs/${id}`, body, 'PUT')
}

export function inviteMember(orgId, gitHubLogin, role) {
  return jsonBody(`${API_BASE}/orgs/${orgId}/members`, { gitHubLogin, role })
}

export function updateMember(orgId, membershipId, role) {
  return jsonBody(`${API_BASE}/orgs/${orgId}/members/${membershipId}`, { role }, 'PUT')
}

export function removeMember(orgId, membershipId) {
  return request(`${API_BASE}/orgs/${orgId}/members/${membershipId}`, { method: 'DELETE' })
}

export function syncCatalog(orgId) {
  return jsonBody(`${API_BASE}/orgs/${orgId}/catalog/sync`, {})
}

// --- Templates ---

export function fetchTemplates() {
  return request(`${API_BASE}/templates`)
}

export function fetchTemplate(name) {
  return request(`${API_BASE}/templates/${name}`)
}

// --- Services (catalog) ---

export function fetchServices(filters = {}) {
  const params = new URLSearchParams(Object.entries(filters).filter(([, v]) => v))
  const qs = params.toString()
  return request(`${API_BASE}/services${qs ? `?${qs}` : ''}`)
}

export function fetchService(id) {
  return request(`${API_BASE}/services/${id}`)
}

// --- Requests ---

export function fetchRequests(filters = {}) {
  const params = new URLSearchParams(Object.entries(filters).filter(([, v]) => v))
  const qs = params.toString()
  return request(`${API_BASE}/requests${qs ? `?${qs}` : ''}`)
}

export function fetchRequest(id) {
  return request(`${API_BASE}/requests/${id}`)
}

export function createRequest(body) {
  return jsonBody(`${API_BASE}/requests`, body)
}

export function approveRequest(id, reason) {
  return jsonBody(`${API_BASE}/requests/${id}/approve`, { reason })
}

export function rejectRequest(id, reason) {
  return jsonBody(`${API_BASE}/requests/${id}/reject`, { reason })
}

// --- Admin ---

export function fetchExecutions(page = 1, pageSize = 20, filters = {}) {
  const params = new URLSearchParams({ page, pageSize, ...filters })
  return request(`${API_BASE}/admin/executions?${params}`)
}

export function fetchExecution(id) {
  return request(`${API_BASE}/admin/executions/${id}`)
}

export function fetchPresets() {
  return request(`${API_BASE}/admin/presets`)
}

export function createPreset(preset) {
  return jsonBody(`${API_BASE}/admin/presets`, preset)
}

export function updatePreset(id, preset) {
  return jsonBody(`${API_BASE}/admin/presets/${id}`, preset, 'PUT')
}

export function deletePreset(id) {
  return request(`${API_BASE}/admin/presets/${id}`, { method: 'DELETE' })
}
