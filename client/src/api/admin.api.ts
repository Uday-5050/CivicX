import { request } from './client'
import type { AdminAccountStatus, AdminAuditEvent, AdminInstitution, AdminModerationItem, AdminReportRow, ModerationStatus } from './types'

export async function listAdminInstitutions(): Promise<AdminInstitution[]> {
  return (await request<AdminInstitution[]>('/admin/institutions')).data
}

export async function listAdminModeration(): Promise<AdminModerationItem[]> {
  return (await request<AdminModerationItem[]>('/admin/moderation')).data
}

export async function listAdminAudit(): Promise<AdminAuditEvent[]> {
  return (await request<AdminAuditEvent[]>('/admin/audit')).data
}

export async function listAdminReports(): Promise<AdminReportRow[]> {
  return (await request<AdminReportRow[]>('/admin/reports')).data
}

export async function decideInstitution(id: string, status: Exclude<AdminAccountStatus, 'pending'>): Promise<AdminInstitution> {
  return (await request<AdminInstitution>(`/admin/institutions/${encodeURIComponent(id)}/status`, { method: 'POST', data: { status } })).data
}

export async function decideModeration(id: string, status: Exclude<ModerationStatus, 'open'>): Promise<AdminModerationItem> {
  return (await request<AdminModerationItem>(`/admin/moderation/${encodeURIComponent(id)}`, { method: 'POST', data: { status } })).data
}
