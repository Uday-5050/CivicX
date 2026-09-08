import { request } from './client'
import type { CivicNotification } from './types'

export async function listNotifications(): Promise<CivicNotification[]> {
  return (await request<CivicNotification[]>('/notifications')).data
}

export async function markNotificationRead(notificationId: string): Promise<CivicNotification> {
  return (await request<CivicNotification>(`/notifications/${encodeURIComponent(notificationId)}/read`, { method: 'POST' })).data
}

export async function markAllNotificationsRead(): Promise<void> {
  await request('/notifications/read-all', { method: 'POST' })
}
