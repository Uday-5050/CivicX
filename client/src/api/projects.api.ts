import { request } from './client'
import type { ProjectBoard, ProjectRecord } from './types'

export async function getProjectBoard(projectId: string): Promise<ProjectBoard> {
  return (await request<ProjectBoard>(`/projects/${encodeURIComponent(projectId)}/board`)).data
}

export async function submitMilestoneEvidence(projectId: string, milestoneId: string, note: string, expectedVersion: number): Promise<ProjectBoard> {
  return (await request<ProjectBoard>(`/projects/${encodeURIComponent(projectId)}/milestones/${encodeURIComponent(milestoneId)}/evidence`, { method: 'POST', data: { note, links: [], expectedVersion } })).data
}

export async function addProjectRecord(projectId: string, kind: 'deliverables' | 'ipDisclosures' | 'testRecords', record: Omit<ProjectRecord, 'id' | 'createdAt'>, expectedVersion: number): Promise<ProjectBoard> {
  return (await request<ProjectBoard>(`/projects/${encodeURIComponent(projectId)}/${kind}`, { method: 'POST', data: { ...record, expectedVersion } })).data
}
