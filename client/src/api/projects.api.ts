import { request } from './client';
import type { ProjectBoard, ProjectRecord } from './types';

const boards: ProjectBoard[] = [{
  id: 'project_001',
  title: 'Waste route planning pilot',
  summary: 'A field-ready routing tool to reduce missed collections across Ward 12.',
  version: 4,
  milestones: [
    { id: 'milestone_discovery', title: 'Discovery and data review', description: 'Confirm the collection dataset, constraints, and field-team workflow.', status: 'completed', dueDate: '2026-09-12', owner: 'Dr. Meera Shah' },
    { id: 'milestone_prototype', title: 'Prototype and route model', description: 'Build the first route model and validate it against historical collections.', status: 'current', dueDate: '2026-09-26', owner: 'Anika Verma' },
    { id: 'milestone_field', title: 'Field test', description: 'Run a two-ward pilot with collection supervisors and capture test records.', status: 'upcoming', dueDate: '2026-10-10', owner: 'Ranchi Municipal Corporation' },
    { id: 'milestone_handoff', title: 'Deployment handoff', description: 'Package the tested workflow and document operational ownership.', status: 'upcoming', dueDate: '2026-10-24', owner: 'Project team' },
  ],
  deliverables: [{ id: 'deliverable_001', title: 'Data inventory', detail: 'Twelve months of collection data with field definitions.', author: 'Anika Verma', createdAt: '2026-09-08T09:00:00.000Z' }],
  ipDisclosures: [{ id: 'ip_001', title: 'Route scoring approach', detail: 'Disclosure recorded; ownership review pending before external deployment.', author: 'Dr. Meera Shah', createdAt: '2026-09-09T11:00:00.000Z' }],
  testRecords: [{ id: 'test_001', title: 'Historical route replay', detail: 'Replay identified 18% fewer missed collections in the sample data.', author: 'Anika Verma', createdAt: '2026-09-10T14:30:00.000Z' }],
  updatedAt: '2026-09-10T14:30:00.000Z',
}];

function cloneBoard(board: ProjectBoard): ProjectBoard { return { ...board, milestones: board.milestones.map((milestone) => ({ ...milestone })), deliverables: board.deliverables.map((record) => ({ ...record })), ipDisclosures: board.ipDisclosures.map((record) => ({ ...record })), testRecords: board.testRecords.map((record) => ({ ...record })) }; }

export async function getProjectBoard(projectId: string): Promise<ProjectBoard> {
  try { return (await request<ProjectBoard>(`/projects/${encodeURIComponent(projectId)}/board`)).data; }
  catch { await new Promise((resolve) => setTimeout(resolve, 180)); const board = boards.find((item) => item.id === projectId); if (!board) throw new Error('Project board not found.'); return cloneBoard(board); }
}

export async function moveProjectMilestone(projectId: string, milestoneId: string, direction: 'forward' | 'back', expectedVersion: number): Promise<ProjectBoard> {
  try { return (await request<ProjectBoard>(`/projects/${encodeURIComponent(projectId)}/milestones/${encodeURIComponent(milestoneId)}/move`, { method: 'POST', data: { direction, expectedVersion } })).data; }
  catch { await new Promise((resolve) => setTimeout(resolve, 240)); const board = boards.find((item) => item.id === projectId); if (!board) throw new Error('Project board not found.'); if (board.version !== expectedVersion) { const error = new Error('This project board is stale.'); error.name = 'ConflictError'; throw error; } const index = board.milestones.findIndex((milestone) => milestone.id === milestoneId); const target = direction === 'forward' ? index + 1 : index - 1; if (index < 0 || target < 0 || target >= board.milestones.length) throw new Error('Milestones can only move one step at a time.'); const current = board.milestones[index]; const next = board.milestones[target]; if (direction === 'forward' && current.status !== 'current') throw new Error('Only the current milestone can advance.'); if (direction === 'back' && next.status !== 'current') throw new Error('A milestone can only move back from the current step.'); current.status = direction === 'forward' ? 'completed' : 'upcoming'; next.status = 'current'; board.version += 1; board.updatedAt = new Date().toISOString(); return cloneBoard(board); }
}

export async function addProjectRecord(projectId: string, kind: 'deliverables' | 'ipDisclosures' | 'testRecords', record: Omit<ProjectRecord, 'id' | 'createdAt'>, expectedVersion: number): Promise<ProjectBoard> {
  try { return (await request<ProjectBoard>(`/projects/${encodeURIComponent(projectId)}/${kind}`, { method: 'POST', data: { ...record, expectedVersion } })).data; }
  catch { await new Promise((resolve) => setTimeout(resolve, 220)); const board = boards.find((item) => item.id === projectId); if (!board) throw new Error('Project board not found.'); if (board.version !== expectedVersion) { const error = new Error('This project board is stale.'); error.name = 'ConflictError'; throw error; } board[kind].push({ ...record, id: `${kind}_${Date.now()}`, createdAt: new Date().toISOString() }); board.version += 1; board.updatedAt = new Date().toISOString(); return cloneBoard(board); }
}