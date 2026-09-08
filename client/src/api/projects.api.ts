import { request } from './client'
import type { ProjectBoard, ProjectRecord } from './types'

export async function getProjectBoard(projectId: string): Promise<ProjectBoard> {
  return (await request<ProjectBoard>(`/projects/${encodeURIComponent(projectId)}/board`)).data
}

export async function moveProjectMilestone(projectId: string, milestoneId: string, direction: 'forward' | 'back', expectedVersion: number): Promise<ProjectBoard> {
  return (await request<ProjectBoard>(`/projects/${encodeURIComponent(projectId)}/milestones/${encodeURIComponent(milestoneId)}/move`, { method: 'POST', data: { direction, expectedVersion } })).data
}

export async function addProjectRecord(projectId: string, kind: 'deliverables' | 'ipDisclosures' | 'testRecords', record: Omit<ProjectRecord, 'id' | 'createdAt'>, expectedVersion: number): Promise<ProjectBoard> {
  return (await request<ProjectBoard>(`/projects/${encodeURIComponent(projectId)}/${kind}`, { method: 'POST', data: { ...record, expectedVersion } })).data
}
