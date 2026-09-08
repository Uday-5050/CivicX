import { request } from './client'
import type { InstitutionMember } from './types'

export async function listInstitutionMembers(): Promise<InstitutionMember[]> {
  return (await request<InstitutionMember[]>('/institution/members')).data
}

export async function setInstitutionMemberStatus(memberId: string, status: InstitutionMember['status']): Promise<InstitutionMember> {
  return (await request<InstitutionMember>(`/institution/members/${encodeURIComponent(memberId)}`, { method: 'PATCH', data: { status } })).data
}
