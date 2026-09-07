import { request } from './client';
import type { ChallengeDecision, UniversityChallenge } from './types';

const challenges: UniversityChallenge[] = [
  {
    id: 'challenge_001', title: 'Improve waste collection route planning',
    summary: 'Create a data-informed route plan that reduces missed collections across Ward 12 while keeping the solution practical for field teams.',
    domain: 'Sustainability', priority: 'high', department: 'Computer Science', organization: 'Ranchi Municipal Corporation',
    feasibilityNotes: ['Existing collection data is available for the last 12 months.', 'Pilot can run in two wards within eight weeks.', 'Requires one field mentor and a student data team.'],
    decision: 'pending', version: 3, createdAt: '2026-09-06T08:30:00.000Z',
    members: [{ id: 'm1', name: 'Dr. Meera Shah', role: 'mentor', department: 'Computer Science', email: 'meera.shah@university.test' }, { id: 'm2', name: 'Anika Verma', role: 'student', department: 'Computer Science', email: 'anika.verma@university.test' }],
  },
  {
    id: 'challenge_002', title: 'Accessible wayfinding for public hospitals',
    summary: 'Design a low-bandwidth wayfinding experience for visitors navigating district hospitals and public health counters.',
    domain: 'Health', priority: 'medium', department: 'Design and Architecture', organization: 'Department of Health',
    feasibilityNotes: ['Hospital staff have agreed to user interviews.', 'The first prototype should support Hindi and English.', 'Accessibility testing is required before pilot approval.'],
    decision: 'pending', version: 1, createdAt: '2026-09-05T11:15:00.000Z',
    members: [{ id: 'm3', name: 'Prof. Rohan Das', role: 'mentor', department: 'Design and Architecture', email: 'rohan.das@university.test' }],
  },
  {
    id: 'challenge_003', title: 'Community learning space energy audit',
    summary: 'Measure energy usage and recommend affordable improvements for community learning spaces.',
    domain: 'Education', priority: 'low', department: 'Electrical Engineering', organization: 'Jharkhand Education Mission',
    feasibilityNotes: ['Three pilot locations are ready for site visits.', 'The work can be completed during the current semester.'],
    decision: 'pending', version: 2, createdAt: '2026-09-04T16:40:00.000Z',
    members: [{ id: 'm4', name: 'Dr. Kavita Rao', role: 'mentor', department: 'Electrical Engineering', email: 'kavita.rao@university.test' }],
  },
];

function cloneChallenge(challenge: UniversityChallenge): UniversityChallenge {
  return {
    ...challenge,
    members: challenge.members.map((member) => ({ ...member })),
    feasibilityNotes: [...challenge.feasibilityNotes],
    proposal: challenge.proposal ? { ...challenge.proposal, studentIds: [...challenge.proposal.studentIds] } : undefined,
  };
}

export async function listUniversityChallenges(): Promise<UniversityChallenge[]> {
  try { return (await request<UniversityChallenge[]>('/university/challenges')).data; }
  catch { await new Promise((resolve) => setTimeout(resolve, 220)); return challenges.map(cloneChallenge); }
}

export async function decideUniversityChallenge(id: string, decision: Exclude<ChallengeDecision, 'pending'>, version: number, proposal?: UniversityChallenge['proposal']): Promise<UniversityChallenge> {
  try { return (await request<UniversityChallenge>(`/university/challenges/${id}/decision`, { method: 'POST', data: { decision, version, proposal } })).data; }
  catch {
    await new Promise((resolve) => setTimeout(resolve, 300));
    const challenge = challenges.find((item) => item.id === id);
    if (!challenge) throw new Error('Challenge not found.');
    if (challenge.version !== version) { const error = new Error('This challenge changed while you were reviewing it.'); error.name = 'ConflictError'; throw error; }
      if (challenge.decision !== 'pending') { const error = new Error('This challenge already has a decision.'); error.name = 'ConflictError'; throw error; }
    challenge.decision = decision; challenge.version += 1; challenge.proposal = proposal ? { ...proposal, studentIds: [...proposal.studentIds] } : undefined; return cloneChallenge(challenge);
  }
}