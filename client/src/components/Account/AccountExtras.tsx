import { useEffect, useState } from 'react'
import { listInstitutionMembers, setInstitutionMemberStatus } from '../../api/members.api'
import type { InstitutionMember } from '../../api/types'
import { useAuth } from '../../features/auth/AuthContext'

export default function AccountExtras() {
  const { user } = useAuth()
  const [pushState, setPushState] = useState<'unsupported' | 'default' | 'granted' | 'denied'>('default')
  const [members, setMembers] = useState<InstitutionMember[]>([])
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  useEffect(() => { if (typeof Notification === 'undefined') setPushState('unsupported'); else setPushState(Notification.permission); if (user?.role === 'university') void listInstitutionMembers(user.id).then(setMembers) }, [user?.id, user?.role])
  if (!user) return null
  const requestPush = async () => { if (typeof Notification === 'undefined') { setPushState('unsupported'); return } setPushState(await Notification.requestPermission()) }
  const updateMember = async (member: InstitutionMember) => { setBusy(true); try { const updated = await setInstitutionMemberStatus(user.id, member.id, member.status === 'active' ? 'suspended' : 'active'); setMembers((current) => current.map((item) => item.id === updated.id ? updated : item)); setNotice(`${updated.name} is now ${updated.status}.`) } catch { setNotice('Unable to update this member.') } finally { setBusy(false) } }
  return <><section className="account-extras account-panel"><div className="panel-title"><div><p className="section-kicker">04 <strong>Location and push</strong></p><h2>Choose your signal.</h2></div></div><p className="account-extra-copy">Location access is requested only when needed. Denying it does not block CivicX.</p><div className="location-control"><div><strong>Push notifications</strong><small>{pushState === 'granted' ? 'Push permission granted.' : pushState === 'denied' ? 'Push denied. In-app alerts remain available.' : pushState === 'unsupported' ? 'Push is unavailable in this browser.' : 'Optional browser alerts for new activity.'}</small></div><button type="button" onClick={() => void requestPush()}>Request push access</button></div></section>{user.role === 'university' && <section className="account-extras account-panel"><div className="panel-title"><div><p className="section-kicker">05 <strong>Institution members</strong></p><h2>Manage access.</h2></div><span>{members.length} members</span></div>{notice && <p className="account-notice" role="status">{notice}</p>}<div className="member-management">{members.map((member) => <div className="managed-member" key={member.id}><div><strong>{member.name}</strong><small>{member.email} · {member.role}</small></div><button type="button" disabled={busy} onClick={() => void updateMember(member)}>{member.status === 'active' ? 'Suspend' : 'Restore'}</button><span className={`member-status member-${member.status}`}>{member.status}</span></div>)}</div></section>}</>
}
