import { request } from './client'
import { ApiError } from './types'
import type { AssignmentDecisionInput, AssignmentDecisionResult, ChallengeDecision, UniversityAssignment, UniversityChallenge } from './types'

export async function listUniversityAssignments(): Promise<UniversityAssignment[]> {
  return (await request<UniversityAssignment[]>('/university/assignments')).data
}

export async function decideUniversityAssignment(assignmentId: string, input: AssignmentDecisionInput): Promise<AssignmentDecisionResult> {
  try {
    return (await request<AssignmentDecisionResult>(`/university/assignments/${encodeURIComponent(assignmentId)}/decision`, { method: 'POST', data: input })).data
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 409) error.name = 'ConflictError'
    throw error
  }
}

/** @deprecated Use listUniversityAssignments for the institutional workflow. */
export async function listUniversityChallenges(): Promise<UniversityChallenge[]> {
  return (await request<UniversityChallenge[]>('/university/challenges')).data
}

/** @deprecated Use decideUniversityAssignment for the institutional workflow. */
export async function decideUniversityChallenge(id: string, decision: Exclude<ChallengeDecision, 'pending'>, version: number, proposal?: UniversityChallenge['proposal']): Promise<UniversityChallenge> {
  try {
    return (await request<UniversityChallenge>(`/university/challenges/${encodeURIComponent(id)}/decision`, { method: 'POST', data: { decision, version, proposal } })).data
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 409) error.name = 'ConflictError'
    throw error
  }
}
