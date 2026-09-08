import { request } from './client'
import type { CollaborationRequest, CollaborationRequestStatus, IndustryProject } from './types'

export async function listIndustryProjects(): Promise<IndustryProject[]> {
  return (await request<IndustryProject[]>('/industry/projects')).data
}

export async function listCollaborationRequests(): Promise<CollaborationRequest[]> {
  return (await request<CollaborationRequest[]>('/industry/collaboration-requests')).data
}

export async function createCollaborationRequest(input: Omit<CollaborationRequest, 'id' | 'status' | 'version' | 'createdAt'>): Promise<CollaborationRequest> {
  return (await request<CollaborationRequest>('/industry/collaboration-requests', { method: 'POST', data: input })).data
}

export async function decideCollaborationRequest(id: string, status: Exclude<CollaborationRequestStatus, 'pending'>, version: number): Promise<CollaborationRequest> {
  return (await request<CollaborationRequest>(`/university/collaboration-requests/${encodeURIComponent(id)}/decision`, { method: 'POST', data: { status, version } })).data
}
