import { request } from './client'
import { ApiError } from './types'
import type { CollaborationRequest, CollaborationRequestStatus, IndustryOpportunity, IndustryProject, OfferStatus, SupportOffer } from './types'
import type { CollaborationType } from './types'

export interface PublishOpportunityInput {
  projectId: string;
  title: string;
  summary: string;
  needs: CollaborationType[];
}

export interface CreateSupportOfferInput {
  supportType: CollaborationType;
  responsibilities: string;
  message: string;
  amountMinor?: number;
  currency?: string;
  inKindDescription?: string;
}

export async function publishUniversityOpportunity(input: PublishOpportunityInput): Promise<IndustryOpportunity> {
  return (await request<IndustryOpportunity>('/university/opportunities', { method: 'POST', data: input })).data
}

export async function listIndustryOpportunities(): Promise<IndustryOpportunity[]> {
  return (await request<IndustryOpportunity[]>('/industry/opportunities')).data
}

export async function listIndustryOffers(): Promise<SupportOffer[]> {
  return (await request<SupportOffer[]>('/industry/offers')).data
}

export async function createIndustrySupportOffer(opportunityId: string, input: CreateSupportOfferInput): Promise<SupportOffer> {
  const { supportType, responsibilities, message, amountMinor, currency, inKindDescription } = input
  const data = {
    supportType,
    responsibilities,
    message,
    ...(amountMinor === undefined ? {} : { amountMinor }),
    ...(currency === undefined ? {} : { currency }),
    ...(inKindDescription === undefined ? {} : { inKindDescription }),
  }
  try {
    return (await request<SupportOffer>(`/industry/opportunities/${encodeURIComponent(opportunityId)}/offers`, {
      method: 'POST',
      data,
    })).data
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 409) error.name = 'ConflictError'
    throw error
  }
}

export async function listUniversityOffers(): Promise<SupportOffer[]> {
  return (await request<SupportOffer[]>('/university/offers')).data
}

export async function decideUniversityOffer(offerId: string, status: Exclude<OfferStatus, 'pending' | 'withdrawn'>, expectedVersion: number): Promise<{ offer: SupportOffer; accessGranted: boolean; memberId?: string }> {
  try {
    return (await request<{ offer: SupportOffer; accessGranted: boolean; memberId?: string }>(`/university/offers/${encodeURIComponent(offerId)}/decision`, { method: 'POST', data: { status, expectedVersion } })).data
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 409) error.name = 'ConflictError'
    throw error
  }
}

/** @deprecated Use listIndustryOpportunities. */
export async function listIndustryProjects(): Promise<IndustryProject[]> {
  return (await request<IndustryProject[]>('/industry/projects')).data
}

/** @deprecated Use the published opportunity and support-offer methods. */
export async function listCollaborationRequests(): Promise<CollaborationRequest[]> {
  return (await request<CollaborationRequest[]>('/industry/collaboration-requests')).data
}

/** @deprecated Use createIndustrySupportOffer. */
export async function createCollaborationRequest(input: Omit<CollaborationRequest, 'id' | 'status' | 'version' | 'createdAt'>): Promise<CollaborationRequest> {
  const { projectId, collaborationType, message } = input
  return (await request<CollaborationRequest>('/industry/collaboration-requests', { method: 'POST', data: { projectId, collaborationType, message } })).data
}

/** @deprecated Use decideUniversityOffer. */
export async function decideCollaborationRequest(id: string, status: Exclude<CollaborationRequestStatus, 'pending'>, version: number): Promise<CollaborationRequest> {
  try {
    return (await request<CollaborationRequest>(`/university/collaboration-requests/${encodeURIComponent(id)}/decision`, { method: 'POST', data: { status, version } })).data
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 409) error.name = 'ConflictError'
    throw error
  }
}
