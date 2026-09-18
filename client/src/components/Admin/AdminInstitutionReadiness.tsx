import { useEffect, useState } from 'react'
import { addAdminInstitutionRosterMember, getAdminInstitutionProfile, getAdminInstitutionRoster, listAdminInstitutions, updateAdminInstitutionProfile, updateAdminInstitutionRosterMember, type AdminInstitutionProfileUpdate, type AdminRosterInput } from '../../api/admin.api'
import type { AdminInstitution, InstitutionProfile, InstitutionRosterMember } from '../../api/types'
import './AdminInstitutionReadiness.css'

export default function AdminInstitutionReadiness() {
  const [institutions, setInstitutions] = useState<AdminInstitution[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [profile, setProfile] = useState<InstitutionProfile | null>(null)
  const [roster, setRoster] = useState<InstitutionRosterMember[]>([])
  const [profileStatus, setProfileStatus] = useState<'draft' | 'verified'>('draft')
  const [acceptingWork, setAcceptingWork] = useState(false)
  const [maxActiveProjects, setMaxActiveProjects] = useState('0')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [newUserId, setNewUserId] = useState('')
  const [newRole, setNewRole] = useState<AdminRosterInput['role']>('student')
  const [newDepartment, setNewDepartment] = useState('')

  const applyProfile = (next: InstitutionProfile) => {
    setProfile(next)
    setProfileStatus(next.profileStatus)
    setAcceptingWork(next.acceptingWork)
    setMaxActiveProjects(String(next.maxActiveProjects))
  }

  const loadInstitutions = async () => {
    try {
      const rows = await listAdminInstitutions()
      setInstitutions(rows)
      setSelectedId((current) => current || rows[0]?.id || '')
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Institution list is unavailable.') }
  }

  const loadSelected = async (id: string) => {
    if (!id) return
    setLoading(true)
    try {
      const [nextProfile, nextRoster] = await Promise.all([getAdminInstitutionProfile(id), getAdminInstitutionRoster(id)])
      applyProfile(nextProfile)
      setRoster(nextRoster)
      setNotice('')
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Unable to load institution readiness.') } finally { setLoading(false) }
  }

  useEffect(() => { void loadInstitutions() }, [])
  useEffect(() => { if (selectedId) void loadSelected(selectedId) }, [selectedId])

  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!selectedId) return
    setBusy(true); setNotice('')
    const input: AdminInstitutionProfileUpdate = { profileStatus, acceptingWork, maxActiveProjects: Math.max(0, Number.parseInt(maxActiveProjects, 10) || 0) }
    try { applyProfile(await updateAdminInstitutionProfile(selectedId, input)); setNotice('Institution readiness updated.') } catch (error) { setNotice(error instanceof Error ? error.message : 'Unable to update institution readiness.') } finally { setBusy(false) }
  }

  const addMember = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!selectedId || !newUserId.trim()) return
    setBusy(true); setNotice('')
    try {
      await addAdminInstitutionRosterMember(selectedId, { userId: newUserId.trim(), role: newRole, department: newDepartment.trim() || undefined, status: 'active' })
      setNewUserId(''); setNewDepartment(''); await loadSelected(selectedId); setNotice('Roster membership activated.')
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Unable to add roster member.') } finally { setBusy(false) }
  }

  const toggleMember = async (member: InstitutionRosterMember) => {
    if (!selectedId) return
    setBusy(true); setNotice('')
    try { await updateAdminInstitutionRosterMember(selectedId, member.userId, { status: member.status === 'active' ? 'suspended' : 'active' }); await loadSelected(selectedId); setNotice(`${member.name} is now ${member.status === 'active' ? 'suspended' : 'active'}.`) } catch (error) { setNotice(error instanceof Error ? error.message : 'Unable to update roster membership.') } finally { setBusy(false) }
  }

  const selectedInstitution = institutions.find((institution) => institution.id === selectedId)
  return <section className="admin-readiness">
    <div className="admin-readiness-heading"><div><p className="section-kicker">05 <strong>Institution readiness</strong></p><h2>Verify capability before routing.</h2><p>Profiles must be active, verified, and accepting work before matching can use them.</p></div><select value={selectedId} onChange={(event) => setSelectedId(event.target.value)} aria-label="Select institution">{institutions.map((institution) => <option key={institution.id} value={institution.id}>{institution.name} · {institution.type}</option>)}</select></div>
    {notice && <p className="admin-readiness-notice" role="status">{notice}</p>}
    {!selectedInstitution ? <p className="admin-readiness-empty">No institutions are available.</p> : <div className="admin-readiness-grid">
      <form className="admin-readiness-panel" onSubmit={(event) => void saveProfile(event)}><div className="admin-readiness-panel-title"><div><h3>{profile?.name ?? selectedInstitution.name}</h3><span>{selectedInstitution.accountStatus} account · {profile?.profileStatus ?? 'draft'} profile</span></div><span className={`admin-status admin-${profileStatus}`}>{profileStatus}</span></div><label>Profile status<select value={profileStatus} onChange={(event) => setProfileStatus(event.target.value as 'draft' | 'verified')}><option value="draft">Draft — needs review</option><option value="verified" disabled={selectedInstitution.accountStatus !== 'active'}>Verified — eligible for routing</option></select></label><div className="admin-readiness-form-row"><label>Active project capacity<input type="number" min="0" value={maxActiveProjects} onChange={(event) => setMaxActiveProjects(event.target.value)} /></label><label className="admin-readiness-checkbox"><input type="checkbox" checked={acceptingWork} onChange={(event) => setAcceptingWork(event.target.checked)} /> Accepting new work</label></div><p className="admin-readiness-hint">Institution capability details are edited by the institution. Verification is an administrator decision and can be withdrawn when details are no longer current.</p><button className="admin-readiness-primary" type="submit" disabled={busy || loading}>{busy ? 'Saving…' : 'Save verification'} <span>→</span></button></form>
      <section className="admin-readiness-panel"><div className="admin-readiness-panel-title"><div><h3>Roster management</h3><span>Admin view includes pending and suspended members.</span></div><strong>{roster.length}</strong></div><form className="admin-roster-add" onSubmit={(event) => void addMember(event)}><input value={newUserId} onChange={(event) => setNewUserId(event.target.value)} placeholder="User ID (MongoDB ObjectId)" aria-label="User ID" required /><select value={newRole} onChange={(event) => setNewRole(event.target.value as AdminRosterInput['role'])} aria-label="New member role"><option value="student">Student</option><option value="mentor">Mentor</option><option value="coordinator">Coordinator</option><option value="partner">Partner</option></select><input value={newDepartment} onChange={(event) => setNewDepartment(event.target.value)} placeholder="Department (optional)" aria-label="Department" /><button type="submit" disabled={busy}>Add</button></form><div className="admin-roster-list">{roster.length ? roster.map((member) => <article key={member.id}><div><strong>{member.name}</strong><small>{member.email} · {member.role}{member.department ? ` · ${member.department}` : ''}</small></div><span className={`admin-status admin-${member.status}`}>{member.status}</span><button type="button" disabled={busy} onClick={() => void toggleMember(member)}>{member.status === 'active' ? 'Suspend' : 'Activate'}</button></article>) : <p className="admin-readiness-empty">No roster memberships recorded.</p>}</div></section>
    </div>}
  </section>
}
