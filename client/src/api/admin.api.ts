import { request } from './client';
import type { AdminAuditEvent, AdminInstitution, AdminModerationItem, AdminReportRow, AdminAccountStatus, ModerationStatus } from './types';

const institutions: AdminInstitution[] = [
  { id: 'inst_001', name: 'CivicX University', type: 'university', accountStatus: 'pending', createdAt: '2026-09-10T09:00:00.000Z', users: 14 },
  { id: 'inst_002', name: 'Ranchi Municipal Corporation', type: 'industry', accountStatus: 'active', createdAt: '2026-09-08T11:00:00.000Z', users: 8 },
  { id: 'inst_003', name: 'Jharkhand Education Mission', type: 'university', accountStatus: 'suspended', createdAt: '2026-09-04T15:30:00.000Z', users: 5 },
  { id: 'inst_004', name: 'Civic Labs Private Limited', type: 'industry', accountStatus: 'active', createdAt: '2026-09-02T12:20:00.000Z', users: 11 },
];
const moderation: AdminModerationItem[] = [
  { id: 'mod_001', title: 'Repeated duplicate reports', reason: 'Three reports share the same location and description.', reporter: 'Test Citizen', status: 'open', createdAt: '2026-09-10T16:00:00.000Z' },
  { id: 'mod_002', title: 'Off-topic submission', reason: 'Submission does not describe a civic issue.', reporter: 'Aarav Kumar', status: 'open', createdAt: '2026-09-09T13:20:00.000Z' },
  { id: 'mod_003', title: 'Resolved content review', reason: 'Reporter appealed an earlier dismissal.', reporter: 'Nisha Rao', status: 'resolved', createdAt: '2026-09-08T10:40:00.000Z' },
];
const audit: AdminAuditEvent[] = [{ id: 'audit_001', action: 'Approved institution', actor: 'admin@civicx.test', target: 'Ranchi Municipal Corporation', createdAt: '2026-09-10T15:00:00.000Z' }, { id: 'audit_002', action: 'Dismissed moderation case', actor: 'admin@civicx.test', target: 'mod_009', createdAt: '2026-09-09T17:25:00.000Z' }];
const reports: AdminReportRow[] = [{ id: 'report_001', domain: 'Public safety', district: 'Ranchi', status: 'under_review', count: 12 }, { id: 'report_002', domain: 'Environment', district: 'Ranchi', status: 'resolved', count: 8 }, { id: 'report_003', domain: 'Health and education', district: 'Jamshedpur', status: 'submitted', count: 6 }, { id: 'report_004', domain: 'Roads and transport', district: 'Dhanbad', status: 'under_review', count: 9 }];

const clone = <T,>(items: T[]) => items.map((item) => ({ ...item }));
const fallback = async <T,>(items: T[]) => { await new Promise((resolve) => setTimeout(resolve, 160)); return clone(items); };
async function get<T>(path: string, items: T[]): Promise<T[]> { try { return (await request<T[]>(path)).data; } catch (error) { if (import.meta.env.DEV) return fallback(items); throw error; } }

export function listAdminInstitutions() { return get('/admin/institutions', institutions); }
export function listAdminModeration() { return get('/admin/moderation', moderation); }
export function listAdminAudit() { return get('/admin/audit', audit); }
export function listAdminReports() { return get('/admin/reports', reports); }

export async function decideInstitution(id: string, status: Exclude<AdminAccountStatus, 'pending'>): Promise<AdminInstitution> {
  try { return (await request<AdminInstitution>(`/admin/institutions/${encodeURIComponent(id)}/status`, { method: 'POST', data: { status } })).data; }
  catch (error) { if (!import.meta.env.DEV) throw error; await new Promise((resolve) => setTimeout(resolve, 180)); const institution = institutions.find((item) => item.id === id); if (!institution) throw new Error('Institution not found.'); institution.accountStatus = status; return { ...institution }; }
}

export async function decideModeration(id: string, status: Exclude<ModerationStatus, 'open'>): Promise<AdminModerationItem> {
  try { return (await request<AdminModerationItem>(`/admin/moderation/${encodeURIComponent(id)}`, { method: 'POST', data: { status } })).data; }
  catch (error) { if (!import.meta.env.DEV) throw error; await new Promise((resolve) => setTimeout(resolve, 180)); const item = moderation.find((entry) => entry.id === id); if (!item) throw new Error('Moderation item not found.'); item.status = status; return { ...item }; }
}