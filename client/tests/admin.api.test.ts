import { afterEach, describe, expect, it, vi } from 'vitest'
import { decideInstitution, decideModeration, listAdminInstitutions, listAdminModeration } from '../src/api/admin.api'
import { request } from '../src/api/client'

vi.mock('../src/api/client', () => ({ request: vi.fn() }))

describe('admin integration contract', () => {
  afterEach(() => vi.mocked(request).mockReset())

  it('does not replace an unavailable admin API with fixtures', async () => {
    vi.mocked(request).mockRejectedValueOnce(new Error('offline'))
    await expect(listAdminInstitutions()).rejects.toThrow('offline')
  })

  it('does not claim an approval or moderation decision after a failed request', async () => {
    vi.mocked(request).mockRejectedValue(new Error('offline'))
    await expect(decideInstitution('inst_001', 'active')).rejects.toThrow('offline')
    await expect(decideModeration('mod_001', 'resolved')).rejects.toThrow('offline')
    await expect(listAdminModeration()).rejects.toThrow('offline')
  })
})
