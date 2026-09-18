import { request } from './client'
import type { InstitutionProfileUpdate } from './institutions.api'
import { ApiError } from './types'
import type { AdminAccountStatus, AdminAuditEvent, AdminClassificationAnalysis, AdminInstitution, AdminModerationItem, AdminReportRow, AdminReviewInput, AdminReviewResult, AdminSubmissionDetail, InstitutionProfile, InstitutionRosterMember, InstitutionRosterMutationResult, ModerationStatus, MilestoneEvidence, MilestoneReview, ProjectClosure, ProposalRevision, ProposalReview, UniversityAssignment, UniversityRecommendationResult } from './types'

export async function listAdminInstitutions(): Promise<AdminInstitution[]> { return (await request<AdminInstitution[]>('/admin/institutions')).data }
export async function listAdminModeration(): Promise<AdminModerationItem[]> { return (await request<AdminModerationItem[]>('/admin/moderation')).data }
export async function listAdminAudit(): Promise<AdminAuditEvent[]> { return (await request<AdminAuditEvent[]>('/admin/audit')).data }
export async function listAdminReports(): Promise<AdminReportRow[]> { return (await request<AdminReportRow[]>('/admin/reports')).data }
export async function decideInstitution(id: string, status: Exclude<AdminAccountStatus, 'pending'>): Promise<AdminInstitution> { return (await request<AdminInstitution>(`/admin/institutions/${encodeURIComponent(id)}/status`, { method: 'POST', data: { status } })).data }
export async function decideModeration(id: string, status: Exclude<ModerationStatus, 'open'>): Promise<AdminModerationItem> { return (await request<AdminModerationItem>(`/admin/moderation/${encodeURIComponent(id)}`, { method: 'POST', data: { status } })).data }

export type AdminInstitutionProfileUpdate = InstitutionProfileUpdate & { profileStatus?: 'draft' | 'verified' }
export type AdminRosterInput = { userId: string; role: 'coordinator' | 'mentor' | 'student' | 'partner'; department?: string; status?: 'pending' | 'active' | 'suspended' }
export type AdminRosterPatch = Partial<Omit<AdminRosterInput, 'userId'>>

export async function getAdminInstitutionProfile(institutionId: string): Promise<InstitutionProfile> {
  return (await request<InstitutionProfile>(`/admin/institutions/${encodeURIComponent(institutionId)}/profile`)).data
}

export async function updateAdminInstitutionProfile(institutionId: string, input: AdminInstitutionProfileUpdate): Promise<InstitutionProfile> {
  return (await request<InstitutionProfile>(`/admin/institutions/${encodeURIComponent(institutionId)}/profile`, { method: 'PATCH', data: input })).data
}

export async function getAdminInstitutionRoster(institutionId: string): Promise<InstitutionRosterMember[]> {
  return (await request<InstitutionRosterMember[]>(`/admin/institutions/${encodeURIComponent(institutionId)}/roster`)).data
}

export async function addAdminInstitutionRosterMember(institutionId: string, input: AdminRosterInput): Promise<InstitutionRosterMutationResult> {
  return (await request<InstitutionRosterMutationResult>(`/admin/institutions/${encodeURIComponent(institutionId)}/roster`, { method: 'POST', data: input })).data
}

export async function updateAdminInstitutionRosterMember(institutionId: string, userId: string, input: AdminRosterPatch): Promise<InstitutionRosterMutationResult> {
  return (await request<InstitutionRosterMutationResult>(`/admin/institutions/${encodeURIComponent(institutionId)}/roster/${encodeURIComponent(userId)}`, { method: 'PATCH', data: input })).data
}

export async function getAdminSubmission(submissionId: string): Promise<AdminSubmissionDetail> { return (await request<AdminSubmissionDetail>(`/admin/submissions/${encodeURIComponent(submissionId)}`)).data }
export async function getAdminSubmissionAnalysis(submissionId: string): Promise<AdminClassificationAnalysis> { return (await request<AdminClassificationAnalysis>(`/admin/submissions/${encodeURIComponent(submissionId)}/analysis`)).data }
export async function retryAdminSubmissionAnalysis(submissionId: string, input: { reason: string; expectedRevision: number }): Promise<{ jobId: string; status: string }> { return (await request<{ jobId: string; status: string }>(`/admin/submissions/${encodeURIComponent(submissionId)}/analysis/retry`, { method: 'POST', data: input })).data }
export async function getAiStatus(): Promise<{ provider: string; model: string; configured: boolean; mode: 'local' | 'remote'; workerEnabled: boolean }> { return (await request<{ provider: string; model: string; configured: boolean; mode: 'local' | 'remote'; workerEnabled: boolean }>('/admin/ai/status')).data }

export async function reviewAdminSubmission(submissionId: string, input: AdminReviewInput): Promise<AdminReviewResult> {
  return (await request<AdminReviewResult>(`/admin/submissions/${encodeURIComponent(submissionId)}/review`, { method: 'POST', data: input })).data
}

export async function getUniversityRecommendations(submissionId: string): Promise<UniversityRecommendationResult> {
  return (await request<UniversityRecommendationResult>(`/admin/university-recommendations/${encodeURIComponent(submissionId)}`)).data
}

export async function routeSubmission(submissionId: string, input: { institutionId: string; departmentId: string; reason?: string }): Promise<UniversityAssignment> {
  try {
    return (await request<UniversityAssignment>(`/admin/submissions/${encodeURIComponent(submissionId)}/route`, { method: 'POST', data: input })).data
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 409) error.name = 'ConflictError'
    throw error
  }
}

export async function reviewProjectProposal(projectId: string, proposalId: string, input: { status: 'approved' | 'returned'; note: string }): Promise<{ proposal: ProposalRevision; review: ProposalReview }> {
  try {
    return (await request<{ proposal: ProposalRevision; review: ProposalReview }>(`/projects/${encodeURIComponent(projectId)}/proposals/${encodeURIComponent(proposalId)}/review`, { method: 'POST', data: input })).data
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 409) error.name = 'ConflictError'
    throw error
  }
}

export async function reviewMilestoneEvidence(projectId: string, input: { evidenceId: string; status: 'approved' | 'rejected'; note: string; expectedVersion: number }): Promise<{ evidence: MilestoneEvidence; review: MilestoneReview; project: { id: string; currentStage: string; version: number } }> {
  try {
    return (await request<{ evidence: MilestoneEvidence; review: MilestoneReview; project: { id: string; currentStage: string; version: number } }>(`/admin/projects/${encodeURIComponent(projectId)}/milestone-reviews`, { method: 'POST', data: input })).data
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 409) error.name = 'ConflictError'
    throw error
  }
}

export async function listProjectClosures(projectId: string): Promise<ProjectClosure[]> { return (await request<ProjectClosure[]>(`/admin/projects/${encodeURIComponent(projectId)}/closures`)).data }

export interface CloseProjectInput {
  baseline: string; target: string; result: string; unit: string; measurementStart: string; measurementEnd: string; method: string; beneficiaries: string; evidence: string[]; validationNote: string; expectedVersion: number;
}

export async function closeProject(projectId: string, input: CloseProjectInput): Promise<{ projectId: string; submissionId: string; closureId: string; status: 'closed'; version: number }> {
  try {
    return (await request<{ projectId: string; submissionId: string; closureId: string; status: 'closed'; version: number }>(`/admin/projects/${encodeURIComponent(projectId)}/close`, { method: 'POST', data: input })).data
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 409) error.name = 'ConflictError'
    throw error
  }
}

export async function reopenProject(projectId: string, input: { reason: string; expectedVersion: number }): Promise<{ projectId: string; submissionId: string; closureId: string; status: 'open'; currentStage: string; version: number }> {
  try {
    return (await request<{ projectId: string; submissionId: string; closureId: string; status: 'open'; currentStage: string; version: number }>(`/admin/projects/${encodeURIComponent(projectId)}/reopen`, { method: 'POST', data: input })).data
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 409) error.name = 'ConflictError'
    throw error
  }
}
