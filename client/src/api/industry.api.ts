import { request } from './client';
import type { CollaborationRequest, CollaborationRequestStatus, IndustryProject } from './types';

const projects: IndustryProject[] = [
  {
    id: 'project_001', title: 'Waste route planning pilot',
    summary: 'A field-ready routing tool to reduce missed collections across Ward 12 using existing municipal data.',
    domain: 'Sustainability', university: 'CivicX University', department: 'Computer Science',
    milestone: 'Pilot design approved', status: 'in_progress', needs: ['mentorship', 'deployment', 'technology_transfer'],
    members: [{ id: 'm1', name: 'Dr. Meera Shah', role: 'mentor', department: 'Computer Science', email: 'meera.shah@university.test' }, { id: 'm2', name: 'Anika Verma', role: 'student', department: 'Computer Science', email: 'anika.verma@university.test' }], accessGrantedTo: [],
  },
  {
    id: 'project_002', title: 'Accessible hospital wayfinding',
    summary: 'A low-bandwidth, bilingual wayfinding experience for visitors navigating district hospitals.',
    domain: 'Health', university: 'CivicX University', department: 'Design and Architecture',
    milestone: 'Prototype testing', status: 'pilot_ready', needs: ['funding', 'prototyping', 'deployment'],
    members: [{ id: 'm3', name: 'Prof. Rohan Das', role: 'mentor', department: 'Design and Architecture', email: 'rohan.das@university.test' }], accessGrantedTo: [],
  },
  {
    id: 'project_003', title: 'Community learning space energy audit',
    summary: 'Affordable energy recommendations for three community learning spaces, ready for implementation partners.',
    domain: 'Education', university: 'CivicX University', department: 'Electrical Engineering',
    milestone: 'Implementation planning', status: 'open', needs: ['funding', 'deployment', 'mentorship'],
    members: [{ id: 'm4', name: 'Dr. Kavita Rao', role: 'mentor', department: 'Electrical Engineering', email: 'kavita.rao@university.test' }], accessGrantedTo: [],
  },
];

const requests: CollaborationRequest[] = [];

function cloneProject(project: IndustryProject): IndustryProject {
  return { ...project, needs: [...project.needs], members: project.members.map((member) => ({ ...member })), accessGrantedTo: [...project.accessGrantedTo] };
}

function cloneRequest(request: CollaborationRequest): CollaborationRequest { return { ...request }; }

export async function listIndustryProjects(): Promise<IndustryProject[]> {
  try { return (await request<IndustryProject[]>('/industry/projects')).data; }
  catch { await new Promise((resolve) => setTimeout(resolve, 220)); return projects.map(cloneProject); }
}

export async function listCollaborationRequests(): Promise<CollaborationRequest[]> {
  try { return (await request<CollaborationRequest[]>('/industry/collaboration-requests')).data; }
  catch { await new Promise((resolve) => setTimeout(resolve, 180)); return requests.map(cloneRequest); }
}

export async function createCollaborationRequest(input: Omit<CollaborationRequest, 'id' | 'status' | 'version' | 'createdAt'>): Promise<CollaborationRequest> {
  try { return (await request<CollaborationRequest>('/industry/collaboration-requests', { method: 'POST', data: input })).data; }
  catch { await new Promise((resolve) => setTimeout(resolve, 260)); const created: CollaborationRequest = { ...input, id: `request_${Date.now()}`, status: 'pending', version: 1, createdAt: new Date().toISOString() }; requests.unshift(created); return cloneRequest(created); }
}

export async function decideCollaborationRequest(id: string, status: Exclude<CollaborationRequestStatus, 'pending'>, version: number): Promise<CollaborationRequest> {
  try { return (await request<CollaborationRequest>(`/university/collaboration-requests/${id}/decision`, { method: 'POST', data: { status, version } })).data; }
  catch { await new Promise((resolve) => setTimeout(resolve, 260)); const collaborationRequest = requests.find((item) => item.id === id); if (!collaborationRequest) throw new Error('Request not found.'); if (collaborationRequest.version !== version || collaborationRequest.status !== 'pending') { const error = new Error('This request is no longer current.'); error.name = 'ConflictError'; throw error; } collaborationRequest.status = status; collaborationRequest.version += 1; if (status === 'accepted') { const project = projects.find((item) => item.id === collaborationRequest.projectId); if (project && !project.accessGrantedTo.includes(collaborationRequest.organization)) project.accessGrantedTo.push(collaborationRequest.organization); } return cloneRequest(collaborationRequest); }
}