import { ApiError } from './types'
import { listMyInstitutionRoster } from './institutions.api'
import type { InstitutionMember, InstitutionRosterMember } from './types'

function toLegacyMember(member: InstitutionRosterMember): InstitutionMember {
  return {
    id: member.id,
    name: member.name,
    email: member.email,
    role: member.role === 'mentor' ? 'mentor' : member.role === 'student' ? 'student' : 'staff',
    status: member.status === 'active' ? 'active' : 'suspended',
  }
}

export async function listInstitutionMembers(): Promise<InstitutionMember[]> {
  return (await listMyInstitutionRoster()).map(toLegacyMember)
}

export async function setInstitutionMemberStatus(memberId: string, status: InstitutionMember['status']): Promise<InstitutionMember> {
  void memberId
  void status
  throw new ApiError(
    { code: 'UNSUPPORTED_CLIENT_ACTION', message: 'Institution member status changes are managed by an administrator.' },
    403,
  )
}
