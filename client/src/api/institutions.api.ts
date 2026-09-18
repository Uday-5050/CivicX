import { request } from './client'
import type { InstitutionProfile, InstitutionRosterMember } from './types'

export interface InstitutionProfileUpdate {
  description?: string;
  domains?: string[];
  expertise?: string[];
  facilities?: string[];
  serviceAreas?: string[];
  departments?: Array<{ id?: string; name: string; domains: string[]; leadUserId?: string; active?: boolean }>;
  maxActiveProjects?: number;
  acceptingWork?: boolean;
}

export async function getMyInstitutionProfile(): Promise<InstitutionProfile> {
  return (await request<InstitutionProfile>('/institutions/me/profile')).data
}

export async function updateMyInstitutionProfile(input: InstitutionProfileUpdate): Promise<InstitutionProfile> {
  return (await request<InstitutionProfile>('/institutions/me/profile', { method: 'PATCH', data: input })).data
}

export async function listMyInstitutionRoster(): Promise<InstitutionRosterMember[]> {
  return (await request<InstitutionRosterMember[]>('/institutions/me/roster')).data
}

export async function getInstitutionProfile(institutionId: string): Promise<InstitutionProfile> {
  return (await request<InstitutionProfile>(`/institutions/${encodeURIComponent(institutionId)}/profile`)).data
}

export async function getInstitutionRoster(institutionId: string): Promise<InstitutionRosterMember[]> {
  return (await request<InstitutionRosterMember[]>(`/institutions/${encodeURIComponent(institutionId)}/roster`)).data
}
