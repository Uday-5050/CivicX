import { useEffect, useState } from 'react'
import { listNotifications, markAllNotificationsRead, markNotificationRead } from '../../api/notifications.api'
import type { CivicNotification } from '../../api/types'
import { useAuth } from '../../features/auth/AuthContext'
import './AccountWorkspace.css'

const preferenceKey = (userId: string) => `civicx_notification_preferences:${userId}`
const formatDate = (value: string) => new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(value))

type Preferences = { project: boolean; submission: boolean; system: boolean }
const defaultPreferences: Preferences = { project: true, submission: true, system: true }

export default function AccountWorkspace() {
  const { user, updateProfile, changePassword } = useAuth()
  const [notifications, setNotifications] = useState<CivicNotification[]>([])
  const [name, setName] = useState(user?.name ?? '')
  const [institution, setInstitution] = useState(user?.institution ?? '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [nextPassword, setNextPassword] = useState('')
  const [preferences, setPreferences] = useState<Preferences>(defaultPreferences)
  const [locationState, setLocationState] = useState<'unknown' | 'granted' | 'denied' | 'unavailable'>('unknown')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  const loadNotifications = async () => { if (!user) return; setNotifications(await listNotifications(user.id)) }
  useEffect(() => {
    if (!user) return
    try { const saved = localStorage.getItem(preferenceKey(user.id)); if (saved) setPreferences({ ...defaultPreferences, ...JSON.parse(saved) as Preferences }) } catch { /* Defaults are safe when storage is unavailable. */ }
    void loadNotifications()
    const reconnect = () => { if (document.visibilityState === 'visible') void loadNotifications() }
    const notificationEvent = () => { void loadNotifications() }
    window.addEventListener('online', reconnect); document.addEventListener('visibilitychange', reconnect)
    window.addEventListener('notification:new', notificationEvent)
    return () => { window.removeEventListener('online', reconnect); document.removeEventListener('visibilitychange', reconnect); window.removeEventListener('notification:new', notificationEvent) }
  }, [user?.id])

  if (!user) return null
  const unread = notifications.filter((notification) => !notification.read).length
  const visibleNotifications = notifications.filter((notification) => preferences[notification.type])
  const savePreferences = (next: Preferences) => { setPreferences(next); localStorage.setItem(preferenceKey(user.id), JSON.stringify(next)) }
  const profileSubmit = async () => { setBusy(true); setNotice(''); const result = await updateProfile({ name, institution }); setNotice(result.ok ? 'Profile updated.' : result.message ?? 'Unable to update profile.'); setBusy(false) }
  const passwordSubmit = async () => { setBusy(true); setNotice(''); const result = await changePassword(currentPassword, nextPassword); if (result.ok) { setCurrentPassword(''); setNextPassword(''); setNotice('Password changed. Other sessions were revoked.') } else setNotice(result.message ?? 'Unable to change password.'); setBusy(false) }
  const requestLocation = () => { if (!navigator.geolocation) { setLocationState('unavailable'); return } setLocationState('unknown'); navigator.geolocation.getCurrentPosition(() => setLocationState('granted'), () => setLocationState('denied'), { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }) }
  const readOne = async (notification: CivicNotification) => { if (notification.read) return; try { const updated = await markNotificationRead(user.id, notification.id); setNotifications((current) => current.map((item) => item.id === updated.id ? updated : item)) } catch { setNotice('That notification is not available to this account.') } }
  const readAll = async () => { await markAllNotificationsRead(user.id); setNotifications((current) => current.map((notification) => ({ ...notification, read: true }))) }

  return <section className="account-workspace"><div className="account-heading"><div><p className="eyebrow"><span /> Account center</p><h1>Your profile and alerts.</h1><p>Manage how CivicX keeps you informed and how your account appears to collaborators.</p></div><span className="unread-badge">{unread} unread</span></div>{notice && <p className="account-notice" role="status">{notice}</p>}<div className="account-grid"><section className="account-panel notifications-panel"><div className="panel-title"><div><p className="section-kicker">01 <strong>Notifications</strong></p><h2>Stay in the loop.</h2></div><button type="button" onClick={() => void readAll()} disabled={!unread}>Mark all read</button></div><div className="notification-list">{visibleNotifications.length ? visibleNotifications.map((notification) => <button type="button" className={`notification-item ${notification.read ? 'read' : 'unread'}`} key={notification.id} onClick={() => void readOne(notification)}><span className={`notification-dot notification-${notification.type}`} /><span><strong>{notification.title}</strong><small>{notification.body}</small><time>{formatDate(notification.createdAt)}</time></span>{!notification.read && <b aria-label="Unread">NEW</b>}</button>) : <p className="empty-account-state">No notifications match your preferences.</p>}</div></section><section className="account-panel"><div className="panel-title"><div><p className="section-kicker">02 <strong>Profile</strong></p><h2>Public account details.</h2></div></div><label className="account-field">Full name<input value={name} onChange={(event) => setName(event.target.value)} /></label><label className="account-field">Email address<input value={user.email} readOnly /></label><label className="account-field">Institution or organization<input value={institution} onChange={(event) => setInstitution(event.target.value)} placeholder="Optional" /></label><button className="account-primary" type="button" disabled={busy} onClick={() => void profileSubmit()}>Save profile <span>→</span></button></section><section className="account-panel"><div className="panel-title"><div><p className="section-kicker">03 <strong>Security</strong></p><h2>Change password.</h2></div></div><label className="account-field">Current password<input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} autoComplete="current-password" /></label><label className="account-field">New password<input type="password" value={nextPassword} onChange={(event) => setNextPassword(event.target.value)} minLength={8} autoComplete="new-password" /></label><button className="account-primary" type="button" disabled={busy} onClick={() => void passwordSubmit()}>Change password <span>→</span></button><small className="account-help">Changing your password signs out other sessions.</small></section><section className="account-panel"><div className="panel-title"><div><p className="section-kicker">04 <strong>Preferences and location</strong></p><h2>Choose your signal.</h2></div></div><div className="preference-list">{(['project', 'submission', 'system'] as const).map((type) => <label key={type}><input type="checkbox" checked={preferences[type]} onChange={(event) => savePreferences({ ...preferences, [type]: event.target.checked })} /> {type === 'project' ? 'Project and collaboration updates' : type === 'submission' ? 'Submission updates' : 'CivicX account notices'}</label>)}</div><div className="location-control"><div><strong>Location access</strong><small>{locationState === 'granted' ? 'Location permission granted.' : locationState === 'denied' ? 'Location denied. CivicX remains usable.' : locationState === 'unavailable' ? 'Location is unavailable in this browser.' : 'Optional; used to improve local results.'}</small></div><button type="button" onClick={requestLocation}>Request access</button></div></section></div></section>
}
