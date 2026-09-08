import { useEffect, useState } from 'react'
import { createCollaborationRequest, listCollaborationRequests, listIndustryProjects } from '../../api/industry.api'
import type { CollaborationRequest, CollaborationType, IndustryProject } from '../../api/types'
import './IndustryWorkspace.css'

const collaborationTypes: CollaborationType[] = ['mentorship', 'funding', 'prototyping', 'deployment', 'technology_transfer']
const domains = ['All', 'Sustainability', 'Health', 'Education']
const labels: Record<CollaborationType, string> = {
  mentorship: 'Mentorship',
  funding: 'Funding',
  prototyping: 'Prototyping',
  deployment: 'Deployment',
  technology_transfer: 'Technology transfer',
}

export default function IndustryWorkspace() {
  const [projects, setProjects] = useState<IndustryProject[]>([])
  const [requests, setRequests] = useState<CollaborationRequest[]>([])
  const [selected, setSelected] = useState<IndustryProject | null>(null)
  const [domain, setDomain] = useState('All')
  const [organization, setOrganization] = useState('')
  const [type, setType] = useState<CollaborationType>('mentorship')
  const [message, setMessage] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  const load = async () => {
    setBusy(true)
    try {
      const [nextProjects, nextRequests] = await Promise.all([listIndustryProjects(), listCollaborationRequests()])
      setProjects(nextProjects)
      setRequests(nextRequests)
      setSelected((current) => current ? nextProjects.find((project) => project.id === current.id) ?? nextProjects[0] ?? null : nextProjects[0] ?? null)
      setNotice('')
    } catch {
      setProjects([])
      setRequests([])
      setSelected(null)
      setNotice('Industry project discovery is not available yet. Please try again later.')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => { void load() }, [])

  const filtered = projects.filter((project) => domain === 'All' || project.domain === domain)
  const projectRequests = requests.filter((item) => item.projectId === selected?.id)

  const submitRequest = async () => {
    if (!selected || !organization.trim() || !message.trim()) {
      setNotice('Add your organization name and a short collaboration proposal before sending.')
      return
    }
    if (projectRequests.some((item) => item.status === 'pending' || item.status === 'accepted')) {
      setNotice('Your organization already has an active request or project access.')
      return
    }
    setBusy(true)
    try {
      const created = await createCollaborationRequest({
        projectId: selected.id,
        projectTitle: selected.title,
        organization: organization.trim(),
        collaborationType: type,
        message: message.trim(),
      })
      setRequests((current) => [created, ...current])
      setMessage('')
      setFormOpen(false)
      setNotice('Collaboration request sent to the university.')
    } catch {
      setNotice('Unable to send the request. Please retry.')
    } finally {
      setBusy(false)
    }
  }

  return <section className="industry-workspace">
    <div className="industry-heading">
      <div>
        <p className="eyebrow"><span /> Industry workspace</p>
        <h1>Find a project to move forward.</h1>
        <p>Match your company&apos;s expertise with university projects and make a focused collaboration request.</p>
      </div>
      <span className="industry-count">{filtered.length} open projects</span>
    </div>

    <div className="industry-filters">
      <label>Domain<select value={domain} onChange={(event) => setDomain(event.target.value)}>{domains.map((item) => <option key={item}>{item}</option>)}</select></label>
      <button type="button" onClick={() => void load()} disabled={busy}>↻ Refresh</button>
    </div>

    {notice && !selected && <p className="industry-notice" role="alert">{notice}</p>}
    {!notice && !projects.length && <p className="empty-requests">No projects are available for collaboration yet.</p>}

    {selected && <div className="industry-layout">
      <div className="project-list">
        {filtered.map((project) => <button type="button" className={selected.id === project.id ? 'project-row selected' : 'project-row'} key={project.id} onClick={() => { setSelected(project); setFormOpen(false); setNotice('') }}>
          <span className="project-status-dot" /><span><strong>{project.title}</strong><small>{project.university} · {project.domain}</small></span><span className="project-arrow">→</span>
        </button>)}
      </div>
      <article className="project-detail">
        <div className="project-top"><span className="project-domain">{selected.domain}</span><span className="project-stage">{selected.status.replace('_', ' ')}</span></div>
        <h2>{selected.title}</h2>
        <p className="project-summary">{selected.summary}</p>
        <div className="project-meta"><span><small>University</small><strong>{selected.university}</strong></span><span><small>Department</small><strong>{selected.department}</strong></span><span><small>Milestone</small><strong>{selected.milestone}</strong></span></div>
        <div className="project-section"><h3>Collaboration opportunities</h3><div className="need-list">{selected.needs.map((need) => <span key={need}>{labels[need]}</span>)}</div></div>
        <div className="project-section"><h3>Project team</h3><div className="member-list">{selected.members.map((member) => <span key={member.id}><b>{member.name.slice(0, 1)}</b>{member.name}<small>{member.role}</small></span>)}</div></div>
        {selected.accessGrantedTo.length > 0 && <p className="access-note">Access granted to: {selected.accessGrantedTo.join(', ')}</p>}
        {notice && <p className="industry-notice" role="status">{notice}</p>}
        {projectRequests.map((item) => <div className="request-card" key={item.id}><div><strong>Your {labels[item.collaborationType]} request</strong><span className={`request-status request-${item.status}`}>{item.status}</span></div><p>{item.message}</p></div>)}
        {formOpen ? <div className="request-form">
          <div className="request-form-heading"><h3>Request collaboration</h3><button type="button" onClick={() => setFormOpen(false)} aria-label="Close request form">×</button></div>
          <label>Company or partner name<input value={organization} onChange={(event) => setOrganization(event.target.value)} /></label>
          <label>Support type<select value={type} onChange={(event) => setType(event.target.value as CollaborationType)}>{collaborationTypes.map((item) => <option key={item} value={item}>{labels[item]}</option>)}</select></label>
          <label>Proposal message<textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Explain the support, resources, or expertise you can provide." rows={4} /></label>
          <button className="request-submit" type="button" disabled={busy} onClick={() => void submitRequest()}>{busy ? 'Sending request...' : 'Send request'} <span>→</span></button>
        </div> : !projectRequests.some((item) => item.status === 'pending' || item.status === 'accepted') && <button type="button" className="request-open" onClick={() => { setFormOpen(true); setNotice('') }}>Request access or collaboration →</button>}
      </article>
    </div>}

    <div className="sent-heading"><div><p className="eyebrow"><span /> Sent-request tracker</p><h2>Requests in motion</h2></div><span>{requests.length} total</span></div>
    <div className="sent-list">{requests.length ? requests.map((item) => <article key={item.id}><div><strong>{item.projectTitle}</strong><small>{labels[item.collaborationType]} · {item.organization}</small></div><span className={`request-status request-${item.status}`}>{item.status}</span></article>) : <p className="empty-requests">No requests sent yet.</p>}</div>
  </section>
}
