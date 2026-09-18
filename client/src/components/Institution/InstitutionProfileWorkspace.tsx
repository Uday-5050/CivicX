import { useEffect, useState } from 'react'
import { getMyInstitutionProfile, listMyInstitutionRoster, updateMyInstitutionProfile, type InstitutionProfileUpdate } from '../../api/institutions.api'
import type { InstitutionProfile, InstitutionRosterMember } from '../../api/types'
import { useAuth } from '../../features/auth/AuthContext'
import './InstitutionProfileWorkspace.css'

type DepartmentDraft = NonNullable<InstitutionProfileUpdate['departments']>[number]
const emptyDepartment = (): DepartmentDraft => ({ name: '', domains: [], active: true })
const parseList = (value: string) => value.split(',').map((item) => item.trim()).filter(Boolean)
const listValue = (value: string[]) => value.join(', ')

export default function InstitutionProfileWorkspace() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<InstitutionProfile | null>(null)
  const [roster, setRoster] = useState<InstitutionRosterMember[]>([])
  const [description, setDescription] = useState('')
  const [domains, setDomains] = useState('')
  const [expertise, setExpertise] = useState('')
  const [facilities, setFacilities] = useState('')
  const [serviceAreas, setServiceAreas] = useState('')
  const [maxActiveProjects, setMaxActiveProjects] = useState('0')
  const [acceptingWork, setAcceptingWork] = useState(false)
  const [departments, setDepartments] = useState<DepartmentDraft[]>([])
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)

  const applyProfile = (next: InstitutionProfile) => {
    setProfile(next)
    setDescription(next.description ?? '')
    setDomains(listValue(next.domains))
    setExpertise(listValue(next.expertise))
    setFacilities(listValue(next.facilities))
    setServiceAreas(listValue(next.serviceAreas))
    setMaxActiveProjects(String(next.maxActiveProjects))
    setAcceptingWork(next.acceptingWork)
    setDepartments(next.departments.map((department) => ({ ...department, domains: [...department.domains] })))
  }

  const load = async () => {
    if (!user || (user.role !== 'university' && user.role !== 'industry')) return
    setLoading(true)
    try {
      const [nextProfile, nextRoster] = await Promise.all([getMyInstitutionProfile(), listMyInstitutionRoster()])
      applyProfile(nextProfile)
      setRoster(nextRoster)
      setNotice('')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Institution details are unavailable.')
    } finally { setLoading(false) }
  }

  useEffect(() => { void load() }, [user?.id, user?.role])

  if (!user || (user.role !== 'university' && user.role !== 'industry')) return null

  const save = async (event: React.FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setNotice('')
    const input: InstitutionProfileUpdate = {
      description: description.trim(),
      domains: parseList(domains),
      expertise: parseList(expertise),
      facilities: parseList(facilities),
      serviceAreas: parseList(serviceAreas),
      departments: departments.filter((department) => department.name.trim()).map((department) => ({ ...department, name: department.name.trim(), domains: department.domains.filter(Boolean) })),
      maxActiveProjects: Math.max(0, Number.parseInt(maxActiveProjects, 10) || 0),
      acceptingWork,
    }
    try {
      applyProfile(await updateMyInstitutionProfile(input))
      setNotice('Institution profile saved. An administrator controls verification.')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Unable to save the institution profile.')
    } finally { setBusy(false) }
  }

  const updateDepartment = (index: number, patch: Partial<DepartmentDraft>) => setDepartments((current) => current.map((department, position) => position === index ? { ...department, ...patch } : department))

  return <section className="institution-profile-workspace">
    <div className="institution-profile-heading"><div><p className="eyebrow"><span /> Institution readiness</p><h1>{profile?.name ?? 'Your institution profile.'}</h1><p>Keep the capabilities, departments, and capacity that administrators use when routing civic work.</p></div><button type="button" className="institution-refresh" onClick={() => void load()} disabled={loading}>↻ Refresh</button></div>
    {notice && <p className="institution-notice" role="status">{notice}</p>}
    {loading && !profile ? <p className="institution-empty">Loading your institution profile…</p> : <div className="institution-profile-grid">
      <form className="institution-panel institution-editor" onSubmit={(event) => void save(event)}>
        <div className="institution-panel-title"><div><p className="section-kicker">01 <strong>Capability profile</strong></p><h2>Be findable for the right work.</h2></div><span className={`institution-status institution-${profile?.profileStatus ?? 'draft'}`}>{profile?.profileStatus ?? 'draft'}</span></div>
        <label>Description<textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={4} placeholder="What can your institution contribute?" /></label>
        <label>Domains<span className="field-hint">Comma-separated</span><input value={domains} onChange={(event) => setDomains(event.target.value)} placeholder="Infrastructure, public services" /></label>
        <label>Expertise<span className="field-hint">Comma-separated</span><input value={expertise} onChange={(event) => setExpertise(event.target.value)} placeholder="Civil engineering, accessibility" /></label>
        <label>Facilities<span className="field-hint">Comma-separated</span><input value={facilities} onChange={(event) => setFacilities(event.target.value)} placeholder="Fabrication lab, field team" /></label>
        <label>Service areas<span className="field-hint">Comma-separated</span><input value={serviceAreas} onChange={(event) => setServiceAreas(event.target.value)} placeholder="Pune district, rural wards" /></label>
        <div className="institution-form-row"><label>Active project capacity<input type="number" min="0" value={maxActiveProjects} onChange={(event) => setMaxActiveProjects(event.target.value)} /></label><label className="institution-checkbox"><input type="checkbox" checked={acceptingWork} onChange={(event) => setAcceptingWork(event.target.checked)} /> Accept new assignments</label></div>
        <div className="institution-departments"><div className="institution-subheading"><div><h3>Departments</h3><span>Routing uses these capability boundaries.</span></div><button type="button" onClick={() => setDepartments((current) => [...current, emptyDepartment()])}>+ Add</button></div>{departments.length ? departments.map((department, index) => <div className="department-row" key={department.id ?? `draft-${index}`}><input value={department.name} onChange={(event) => updateDepartment(index, { name: event.target.value })} placeholder="Department name" /><input value={listValue(department.domains)} onChange={(event) => updateDepartment(index, { domains: parseList(event.target.value) })} placeholder="Domains" /><button type="button" aria-label={`Remove ${department.name || 'department'}`} onClick={() => setDepartments((current) => current.filter((_, position) => position !== index))}>×</button></div>) : <p className="institution-empty">Add at least one department before requesting verification.</p>}</div>
        <button className="institution-primary" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save institution profile'} <span>→</span></button>
      </form>
      <section className="institution-panel institution-roster"><div className="institution-panel-title"><div><p className="section-kicker">02 <strong>Verified roster</strong></p><h2>People who can work here.</h2></div><span className="roster-count">{roster.length} active</span></div><p className="institution-muted">Only an administrator can activate or suspend roster memberships. Active users appear in team selection after verification.</p>{roster.length ? <div className="institution-roster-list">{roster.map((member) => <article key={member.id}><span className="roster-avatar">{member.name.slice(0, 1).toUpperCase()}</span><div><strong>{member.name}</strong><small>{member.email}</small></div><span className="roster-role">{member.role}</span></article>)}</div> : <p className="institution-empty">No active roster members yet.</p>}<div className="institution-readiness-note"><strong>Profile status: {profile?.profileStatus ?? 'draft'}</strong><span>{profile?.profileStatus === 'verified' ? 'Your capability profile can be considered for routing.' : 'Save your details, then ask an administrator to verify this profile.'}</span></div></section>
    </div>}
  </section>
}
