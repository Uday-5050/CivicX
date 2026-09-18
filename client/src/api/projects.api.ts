import { request } from './client'
import { ApiError } from './types'
import type { AuthorizedProjectSummary, MilestoneEvidence, MilestoneReview, ProjectBoard, ProjectMembership, ProjectMembershipRole, ProjectRecord, ProposalInput, ProposalRevision } from './types'

export async function listAuthorizedProjects(): Promise<AuthorizedProjectSummary[]> {
  return (await request<AuthorizedProjectSummary[]>('/projects')).data
}

export async function getProjectBoard(projectId: string): Promise<ProjectBoard> {
  return (await request<ProjectBoard>(`/projects/${encodeURIComponent(projectId)}/board`)).data
}

export async function listProjectMembers(projectId: string): Promise<ProjectMembership[]> {
  return (await request<ProjectMembership[]>(`/projects/${encodeURIComponent(projectId)}/members`)).data
}

export async function listMilestoneEvidence(projectId: string): Promise<MilestoneEvidence[]> {
  return (await request<MilestoneEvidence[]>(`/projects/${encodeURIComponent(projectId)}/milestone-evidence`)).data
}

export async function listMilestoneReviews(projectId: string): Promise<MilestoneReview[]> {
  return (await request<MilestoneReview[]>(`/projects/${encodeURIComponent(projectId)}/milestone-reviews`)).data
}

export async function addProjectMember(projectId: string, input: { userId: string; role: Exclude<ProjectMembershipRole, 'industry_partner'>; expectedVersion: number }): Promise<{ member: ProjectMembership; projectVersion: number }> {
  try {
    return (await request<{ member: ProjectMembership; projectVersion: number }>(`/projects/${encodeURIComponent(projectId)}/members`, { method: 'POST', data: input })).data
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 409) error.name = 'ConflictError'
    throw error
  }
}

export async function listProjectProposals(projectId: string): Promise<ProposalRevision[]> {
  return (await request<ProposalRevision[]>(`/projects/${encodeURIComponent(projectId)}/proposals`)).data
}

export async function submitProjectProposal(projectId: string, input: ProposalInput): Promise<ProposalRevision> {
  return (await request<ProposalRevision>(`/projects/${encodeURIComponent(projectId)}/proposals`, { method: 'POST', data: input })).data
}

export async function submitMilestoneEvidence(projectId: string, milestoneId: string, note: string, expectedVersion: number, links: string[] = []): Promise<ProjectBoard> {
  try {
    const response = await request<{ evidence: MilestoneEvidence; board: ProjectBoard }>(`/projects/${encodeURIComponent(projectId)}/milestones/${encodeURIComponent(milestoneId)}/evidence`, { method: 'POST', data: { note, links, expectedVersion } })
    return response.data.board
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 409) error.name = 'ConflictError'
    throw error
  }
}

export async function advanceProjectStage(projectId: string, stage: string, approvedReviewId: string, expectedVersion: number): Promise<{ review: MilestoneReview; board: ProjectBoard }> {
  try {
    return (await request<{ review: MilestoneReview; board: ProjectBoard }>(`/projects/${encodeURIComponent(projectId)}/milestones/${encodeURIComponent(stage)}/advance`, { method: 'POST', data: { approvedReviewId, expectedVersion } })).data
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 409) error.name = 'ConflictError'
    throw error
  }
}

export async function addProjectRecord(projectId: string, kind: 'deliverables' | 'ipDisclosures' | 'testRecords', record: Omit<ProjectRecord, 'id' | 'createdAt'>, expectedVersion: number): Promise<ProjectBoard> {
  const { title, detail } = record
  try {
    return (await request<ProjectBoard>(`/projects/${encodeURIComponent(projectId)}/${kind}`, { method: 'POST', data: { title, detail, expectedVersion } })).data
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 409) error.name = 'ConflictError'
    throw error
  }
}
