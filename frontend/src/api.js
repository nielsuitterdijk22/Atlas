const API_BASE = '/api'

export async function fetchTemplates() {
  const res = await fetch(`${API_BASE}/templates`)
  if (!res.ok) throw new Error('Failed to fetch templates')
  return res.json()
}

export async function fetchTemplate(name) {
  const res = await fetch(`${API_BASE}/templates/${name}`)
  if (!res.ok) throw new Error(`Template '${name}' not found`)
  return res.json()
}

export async function executeTemplate(name, values) {
  const res = await fetch(`${API_BASE}/templates/${name}/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ values })
  })
  return res.json()
}
