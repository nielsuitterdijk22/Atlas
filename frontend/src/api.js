const API_BASE = '/api'

class ApiError extends Error {
  constructor(message, status, detail) {
    super(message)
    this.status = status
    this.detail = detail
  }
}

async function request(url, options) {
  let res
  try {
    res = await fetch(url, options)
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
    throw new ApiError(
      `Request failed (${res.status})`,
      res.status,
      detail
    )
  }

  if (res.status === 204) return null

  return res.json()
}

export async function fetchTemplates() {
  return request(`${API_BASE}/templates`)
}

export async function fetchTemplate(name) {
  return request(`${API_BASE}/templates/${name}`)
}

export async function executeTemplate(name, values) {
  return request(`${API_BASE}/templates/${name}/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ values })
  })
}

// --- Admin API ---

export async function fetchExecutions(page = 1, pageSize = 20, filters = {}) {
  const params = new URLSearchParams({ page, pageSize, ...filters })
  return request(`${API_BASE}/admin/executions?${params}`)
}

export async function fetchExecution(id) {
  return request(`${API_BASE}/admin/executions/${id}`)
}

export async function fetchPresets() {
  return request(`${API_BASE}/admin/presets`)
}

export async function createPreset(preset) {
  return request(`${API_BASE}/admin/presets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(preset)
  })
}

export async function updatePreset(id, preset) {
  return request(`${API_BASE}/admin/presets/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(preset)
  })
}

export async function deletePreset(id) {
  return request(`${API_BASE}/admin/presets/${id}`, {
    method: 'DELETE',
  })
}
