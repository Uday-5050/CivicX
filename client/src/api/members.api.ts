import type { InstitutionMember } from './types';

const storageKey = (userId: string) => `civicx_members:${userId}`;

function seedMembers(): InstitutionMember[] {
  return [
    { id: 'member_staff_001', name: 'Dr. Meera Shah', email: 'meera.shah@university.test', role: 'staff', status: 'active' },
    { id: 'member_mentor_001', name: 'Prof. Rohan Das', email: 'rohan.das@university.test', role: 'mentor', status: 'active' },
    { id: 'member_student_001', name: 'Anika Verma', email: 'anika.verma@university.test', role: 'student', status: 'active' },
  ];
}

export async function listInstitutionMembers(userId: string): Promise<InstitutionMember[]> {
  try { const response = await fetch('/api/institution/members', { headers: { 'X-User-Id': userId } }); if (!response.ok) throw new Error('Members unavailable'); return (await response.json() as { data: InstitutionMember[] }).data; }
  catch { await new Promise((resolve) => setTimeout(resolve, 120)); const saved = localStorage.getItem(storageKey(userId)); if (saved) return JSON.parse(saved) as InstitutionMember[]; const seeded = seedMembers(); localStorage.setItem(storageKey(userId), JSON.stringify(seeded)); return seeded; }
}

export async function setInstitutionMemberStatus(userId: string, memberId: string, status: InstitutionMember['status']): Promise<InstitutionMember> {
  try { const response = await fetch(`/api/institution/members/${encodeURIComponent(memberId)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'X-User-Id': userId }, body: JSON.stringify({ status }) }); if (!response.ok) throw new Error('Member update failed'); return (await response.json() as { data: InstitutionMember }).data; }
  catch { await new Promise((resolve) => setTimeout(resolve, 150)); const members = await listInstitutionMembers(userId); const member = members.find((item) => item.id === memberId); if (!member) throw new Error('Member not found.'); member.status = status; localStorage.setItem(storageKey(userId), JSON.stringify(members)); return { ...member }; }
}