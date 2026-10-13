import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// The sandbox has no .NET toolchain, so the xUnit suite in Yaly.Api.Tests
// (which boots the real API against the throwaway test database) cannot run
// here. This test statically verifies the tenant-isolation contract that the
// task requires: the single-service read must be scoped to the caller's
// organization and must 404 when the row does not belong to it.

const controller = readFileSync(
  resolve(__dirname, '../../../Yaly.Api/Controllers/ServicesController.cs'),
  'utf8',
)

function getActionBody() {
  const start = controller.indexOf('public async Task<ActionResult<Service>> Get(')
  expect(start, 'ServicesController.Get action must exist').toBeGreaterThan(-1)
  const next = controller.indexOf('public async Task', start + 1)
  return controller.slice(start, next === -1 ? undefined : next)
}

describe('backend tenant isolation (ServicesController)', () => {
  it('scopes the single-service read to the caller organization', () => {
    const body = getActionBody()
    // The query must filter on the resolved tenant (acc.OrgId), never on
    // user-supplied input.
    expect(body).toMatch(/FirstOrDefaultAsync\(\s*s\s*=>\s*s\.Id\s*==\s*id\s*&&\s*s\.OrgId\s*==\s*acc\.OrgId\s*\)/)
  })

  it('returns 404 when the service is not in the caller organization', () => {
    const body = getActionBody()
    expect(body).toMatch(/if\s*\(\s*service\s*==\s*null\s*\)\s*return\s*NotFound\(\)/)
  })

  it('resolves the tenant from the authenticated context, not request input', () => {
    const body = getActionBody()
    expect(body).toContain('RequireOrgAsync()')
    expect(body).not.toMatch(/OrgId\s*==\s*request\.Headers/i)
  })

  it('scopes the service list to the caller organization', () => {
    const listStart = controller.indexOf('public async Task<ActionResult<ServiceListResponse>> List(')
    expect(listStart, 'ServicesController.List action must exist').toBeGreaterThan(-1)
    const listBody = controller.slice(listStart, controller.indexOf('public async Task', listStart + 1))
    expect(listBody).toMatch(/Where\(\s*s\s*=>\s*s\.OrgId\s*==\s*acc\.OrgId\s*\)/)
  })
})
