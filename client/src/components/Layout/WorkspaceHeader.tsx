import { useEffect, useState } from 'react'
import { getUnreadNotificationCount } from '../../api/notifications.api'
import type { Role } from '../../constants/roles'
import Brand from './Brand'
import './Layout.css'

type WorkspacePath = '/home' | '/submit' | '/tracker' | '/university' | '/industry' | '/projects' | '/settings' | '/admin'
type WorkspaceHeaderProps = { role: Role; currentPath: WorkspacePath; name: string; onSignOut: () => void }

const navigation: Record<Role, Array<{ href: WorkspacePath; label: string }>> = {
  citizen: [
    { href: '/home', label: 'Dashboard' },
    { href: '/submit', label: 'Raise a report' },
    { href: '/tracker', label: 'My reports' },
    { href: '/settings', label: 'Settings' },
  ],
  university: [
    { href: '/home', label: 'Dashboard' },
    { href: '/university', label: 'Assignments' },
    { href: '/projects', label: 'Projects' },
    { href: '/settings', label: 'Settings' },
  ],
  industry: [
    { href: '/home', label: 'Dashboard' },
    { href: '/industry', label: 'Opportunities' },
    { href: '/projects', label: 'Projects' },
    { href: '/settings', label: 'Settings' },
  ],
  admin: [
    { href: '/admin', label: 'Admin dashboard' },
    { href: '/settings', label: 'Settings' },
  ],
}

export default function WorkspaceHeader({ role, currentPath, name, onSignOut }: WorkspaceHeaderProps) {
  const [unread, setUnread] = useState(0)
  useEffect(() => {
    const load = () => { if (document.visibilityState === 'visible') void getUnreadNotificationCount().then(setUnread).catch(() => setUnread(0)) }
    load()
    const poll = window.setInterval(load, 30000)
    window.addEventListener('online', load); document.addEventListener('visibilitychange', load); window.addEventListener('notification:new', load)
    return () => { window.clearInterval(poll); window.removeEventListener('online', load); document.removeEventListener('visibilitychange', load); window.removeEventListener('notification:new', load) }
  }, [])
  return <header className="workspace-header">
    <Brand />
    <nav className="workspace-nav" aria-label="Workspace navigation">
      {navigation[role].map((item) => <a className={item.href === currentPath ? 'active' : ''} href={`#${item.href}`} aria-current={item.href === currentPath ? 'page' : undefined} key={item.href}>{item.label}{item.href === '/settings' && unread > 0 && <span className="workspace-notification-badge" aria-label={`${unread} unread notifications`}>{unread > 9 ? '9+' : unread}</span>}</a>)}
    </nav>
    <div className="workspace-account"><span className="workspace-account-name">{name}</span><button type="button" onClick={onSignOut}>Sign out</button></div>
  </header>
}
