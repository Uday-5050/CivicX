import { request } from './client';
import { ApiError, type ChallengeDecision, type UniversityChallenge } from './types';

export async function listUniversityChallenges(): Promise<UniversityChallenge[]> {
  return (await request<UniversityChallenge[]>('/university/challenges')).data;
}

export async function decideUniversityChallenge(id: string, decision: Exclude<ChallengeDecision, 'pending'>, version: number, proposal?: UniversityChallenge['proposal']): Promise<UniversityChallenge> {
  try {
    return (await request<UniversityChallenge>(`/university/challenges/${encodeURIComponent(id)}/decision`, { method: 'POST', data: { decision, version, proposal } })).data;
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 409) error.name = 'ConflictError';
    throw error;
  }
}
