import { afterEach, describe, expect, it, vi } from 'vitest'
import { decideInstitution, decideModeration, listAdminInstitutions, listAdminModeration } from '../src/api/admin.api'

describe('admin integration contract', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('loads development fixtures when the admin API is unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    const institutions = await listAdminInstitutions()
    expect(institutions.some((institution) => institution.accountStatus === 'pending')).toBe(true)
  })

  it('persists an approval and moderation decision in the fallback store', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    const approved = await decideInstitution('inst_001', 'active')
    const resolved = await decideModeration('mod_001', 'resolved')
    expect(approved.accountStatus).toBe('active')
    expect(resolved.status).toBe('resolved')
    expect((await listAdminModeration()).find((item) => item.id === 'mod_001')?.status).toBe('resolved')
  })
})