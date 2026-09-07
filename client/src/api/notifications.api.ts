import type { CivicNotification } from './types';

const storageKey = (userId: string) => `civicx_notifications:${userId}`;

function seedNotifications(userId: string): CivicNotification[] {
  return [
    { id: 'notification_project_001', userId, type: 'project', title: 'Project board updated', body: 'The waste route planning pilot has a new milestone review.', read: false, createdAt: '2026-09-10T14:30:00.000Z' },
    { id: 'notification_submission_001', userId, type: 'submission', title: 'Submission under review', body: 'Your public safety report is now with the review team.', read: false, createdAt: '2026-09-09T10:15:00.000Z' },
    { id: 'notification_system_001', userId, type: 'system', title: 'Profile ready', body: 'Add your location and notification preferences to personalize CivicX.', read: true, createdAt: '2026-09-08T08:00:00.000Z' },
  ];
}

function readStored(userId: string): CivicNotification[] {
  try {
    const saved = localStorage.getItem(storageKey(userId));
    if (saved) return JSON.parse(saved) as CivicNotification[];
  } catch { /* Use fresh fixtures when storage is unavailable. */ }
  const seeded = seedNotifications(userId);
  localStorage.setItem(storageKey(userId), JSON.stringify(seeded));
  return seeded;
}

function save(userId: string, notifications: CivicNotification[]) { localStorage.setItem(storageKey(userId), JSON.stringify(notifications)); }

export async function listNotifications(userId: string): Promise<CivicNotification[]> {
  try { return (await fetch('/api/notifications', { headers: { 'X-User-Id': userId } }).then(async (response) => { if (!response.ok) throw new Error('Notifications unavailable'); return response.json() as Promise<{ data: CivicNotification[] }>; })).data; }
  catch { await new Promise((resolve) => setTimeout(resolve, 120)); return readStored(userId); }
}

export async function markNotificationRead(userId: string, notificationId: string): Promise<CivicNotification> {
  try { return (await fetch(`/api/notifications/${encodeURIComponent(notificationId)}/read`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-User-Id': userId } }).then(async (response) => { if (!response.ok) throw new Error('Notification update failed'); return response.json() as Promise<{ data: CivicNotification }>; })).data; }
  catch { await new Promise((resolve) => setTimeout(resolve, 120)); const notifications = readStored(userId); const notification = notifications.find((item) => item.id === notificationId); if (!notification || notification.userId !== userId) { const error = new Error('Notification is not available to this user.'); error.name = 'ForbiddenError'; throw error; } notification.read = true; save(userId, notifications); return { ...notification }; }
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  try { const response = await fetch('/api/notifications/read-all', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-User-Id': userId } }); if (!response.ok) throw new Error('Notification update failed'); return; }
  catch { await new Promise((resolve) => setTimeout(resolve, 120)); const notifications = readStored(userId).map((notification) => ({ ...notification, read: true })); save(userId, notifications); }
}
