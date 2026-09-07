import { useEffect, useState } from 'react'
import { decideUniversityChallenge, listUniversityChallenges } from '../../api/university.api'
import type { ChallengeDecision, UniversityChallenge } from '../../api/types'
import './UniversityInbox.css'

const domains = ['All', 'Sustainability', 'Health', 'Education']
const priorities = ['All', 'high', 'medium', 'low']

export default function UniversityInbox() {
  const [challenges, setChallenges] = useState<UniversityChallenge[]>([])
  const [selected, setSelected] = useState<UniversityChallenge | null>(null)
  const [domain, setDomain] = useState('All')
  const [priority, setPriority] = useState('All')
  const [proposalOpen, setProposalOpen] = useState(false)
  const [approach, setApproach] = useState('')
  const [timeline, setTimeline] = useState('8 weeks')
  const [mentorId, setMentorId] = useState('')
  const [studentIds, setStudentIds] = useState<string[]>([])
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  const load = async () => { try { const next = await listUniversityChallenges(); setChallenges(next); setSelected((current) => (current ? next.find((item) => item.id === current.id) : next[0]) ?? null) } catch { setNotice('Unable to load challenges. Please retry.') } }
  useEffect(() => { void load() }, [])
  const filtered = challenges.filter((challenge) => (domain === 'All' || challenge.domain === domain) && (priority === 'All' || challenge.priority === priority))
  const mentors = selected?.members.filter((member) => member.role === 'mentor') ?? []
  const students = selected?.members.filter((member) => member.role === 'student') ?? []
  const decide = async (decision: Exclude<ChallengeDecision, 'pending'>) => {
    if (!selected) return
      if (selected.decision !== 'pending') { setNotice('This challenge already has a recorded decision.'); return }
    if (decision === 'accepted' && (!approach.trim() || !mentorId || !studentIds.length)) { setNotice('Add an approach, mentor, and at least one student before accepting.'); setProposalOpen(true); return }
    setBusy(true); setNotice('')
    try {
      const updated = await decideUniversityChallenge(selected.id, decision, selected.version, decision === 'accepted' ? { approach, timeline, mentorId, studentIds } : undefined)
      setChallenges((current) => current.map((item) => item.id === updated.id ? updated : item)); setSelected(updated); setProposalOpen(false); setNotice(decision === 'accepted' ? 'Project created and proposal saved.' : decision === 'declined' ? 'Challenge declined.' : 'Request for more information recorded.')
    } catch (error) { if (error instanceof Error && error.name === 'ConflictError') { setNotice('This decision is stale. The latest challenge was loaded again.'); await load() } else setNotice('Unable to save the decision. Please retry.') }
    finally { setBusy(false) }
  }

  return <section className="university-inbox"><div className="university-heading"><div><p className="eyebrow"><span /> University workspace</p><h1>Challenge inbox</h1><p>Review civic challenges, build a team, and turn a good idea into a project.</p></div><span className="inbox-count">{filtered.length} open challenges</span></div><div className="university-filters"><label>Domain<select value={domain} onChange={(event) => setDomain(event.target.value)}>{domains.map((item) => <option key={item}>{item}</option>)}</select></label><label>Priority<select value={priority} onChange={(event) => setPriority(event.target.value)}>{priorities.map((item) => <option key={item}>{item === 'All' ? item : `${item[0].toUpperCase()}${item.slice(1)} priority`}</option>)}</select></label><button type="button" onClick={() => void load()}>↻ Refresh</button></div>{notice && !selected && <p className="university-notice" role="status">{notice}</p>}{!challenges.length && !notice && <p>No challenges assigned yet.</p>}<div className="inbox-layout"><div className="challenge-list">{filtered.map((challenge) => <button type="button" className={`challenge-row ${selected?.id === challenge.id ? 'selected' : ''}`} key={challenge.id} onClick={() => { setSelected(challenge); setNotice('') }}><span className={`priority-dot priority-${challenge.priority}`} /><span><strong>{challenge.title}</strong><small>{challenge.organization} · {challenge.domain}</small></span><span className="challenge-row-arrow">→</span></button>)}</div>{selected && <article className="challenge-detail"><div className="detail-top"><span className={`priority-label priority-label-${selected.priority}`}>{selected.priority} priority</span><span className={`decision-label decision-${selected.decision}`}>{selected.decision.replace('_', ' ')}</span></div><h2>{selected.title}</h2><p className="detail-summary">{selected.summary}</p><div className="detail-meta"><span><small>Department</small><strong>{selected.department}</strong></span><span><small>Partner</small><strong>{selected.organization}</strong></span></div><div className="feasibility"><h3>Feasibility notes</h3>{selected.feasibilityNotes.map((note) => <p key={note}>✓ {note}</p>)}</div><div className="team-section"><div className="team-title"><h3>Project team</h3><button type="button" onClick={() => setProposalOpen(true)}>+ Manage team</button></div><div className="team-members">{selected.members.map((member) => <span className="member-chip" key={member.id}><b>{member.name.slice(0, 1)}</b><span>{member.name}<small>{member.role} · {member.department}</small></span></span>)}</div></div>{notice && <p className="university-notice" role="status">{notice}</p>}<div className="decision-actions"><button type="button" className="decision-secondary" disabled={busy} onClick={() => void decide('info_requested')}>Request info</button><button type="button" className="decision-danger" disabled={busy} onClick={() => void decide('declined')}>Decline</button><button type="button" className="decision-primary" disabled={busy} onClick={() => { setProposalOpen(true); setNotice('') }}>Accept & build proposal →</button></div>{proposalOpen && <div className="proposal-panel"><div className="proposal-heading"><h3>Build project proposal</h3><button type="button" onClick={() => setProposalOpen(false)}>×</button></div><label>Approach<textarea value={approach} onChange={(event) => setApproach(event.target.value)} placeholder="What will your team deliver?" rows={3} /></label><div className="proposal-grid"><label>Timeline<select value={timeline} onChange={(event) => setTimeline(event.target.value)}><option>4 weeks</option><option>8 weeks</option><option>12 weeks</option></select></label><label>Mentor<select value={mentorId} onChange={(event) => setMentorId(event.target.value)}><option value="">Select mentor</option>{mentors.map((mentor) => <option key={mentor.id} value={mentor.id}>{mentor.name}</option>)}</select></label></div><label>Students</label><div className="student-options">{students.length ? students.map((student) => <label key={student.id}><input type="checkbox" checked={studentIds.includes(student.id)} onChange={() => setStudentIds((current) => current.includes(student.id) ? current.filter((id) => id !== student.id) : [...current, student.id])} /> {student.name}</label>) : <small>No students added yet. Use Manage team to add members.</small>}</div><button type="button" className="proposal-save" onClick={() => void decide('accepted')} disabled={busy}>{busy ? 'Creating project...' : 'Create project'}</button></div>}</article>}</div></section>
}