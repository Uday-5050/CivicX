import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { decideUniversityAssignment, listUniversityAssignments } from '../../api/university.api'
import type { AssignmentDecision, AssignmentDecisionInput, UniversityAssignment } from '../../api/types'
import './UniversityInbox.css'

const formatDate = (value: string | undefined) => {
  const date = new Date(String(value ?? ''))
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(date)
}

const messageFor = (decision: AssignmentDecision) => decision === 'accepted' ? 'Assignment accepted. The project is ready for your team.' : decision === 'declined' ? 'Assignment declined and the capacity reservation was released.' : 'Clarification request sent to the administrator.'

export default function UniversityInbox() {
  const [assignments, setAssignments] = useState<UniversityAssignment[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [domain, setDomain] = useState('All')
  const [status, setStatus] = useState<'All' | 'pending' | 'accepted' | 'declined'>('All')
  const [reason, setReason] = useState('')
  const [question, setQuestion] = useState('')
  const [decisionPanel, setDecisionPanel] = useState<Exclude<AssignmentDecision, 'accepted'> | null>(null)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [projectIds, setProjectIds] = useState<Record<string, string>>({})

  const load = async () => {
    try {
      const next = await listUniversityAssignments()
      setAssignments(next)
      setSelectedId((current) => current && next.some((item) => item.id === current) ? current : next[0]?.id ?? '')
      setError('')
    } catch (loadError) { setError(loadError instanceof Error ? loadError.message : 'Unable to load assignments. Please retry.') } finally { setLoading(false) }
  }

  useEffect(() => { void load() }, [])

  const domains = useMemo(() => ['All', ...new Set(assignments.map((item) => item.report?.domain).filter((value): value is string => Boolean(value)))], [assignments])
  const filtered = useMemo(() => assignments.filter((assignment) => (domain === 'All' || assignment.report?.domain === domain) && (status === 'All' || assignment.status === status)), [assignments, domain, status])
  const selected = assignments.find((assignment) => assignment.id === selectedId) ?? null
  const pendingCount = assignments.filter((assignment) => assignment.status === 'pending').length

  const openDecision = (next: Exclude<AssignmentDecision, 'accepted'>) => { setDecisionPanel(next); setReason(''); setQuestion(''); setNotice(''); setError('') }

  const decide = async (next: AssignmentDecision) => {
    if (!selected) return
    if (selected.status !== 'pending') { setError('This assignment already has a decision. Refresh to see the current state.'); return }
    if (next === 'declined' && !reason.trim()) { setError('Add a reason before declining an assignment.'); return }
    if (next === 'info_requested' && !question.trim()) { setError('Add the clarification question for the administrator.'); return }
    setBusy(true); setNotice(''); setError('')
    const input: AssignmentDecisionInput = { decision: next, expectedVersion: selected.version, ...(reason.trim() ? { reason: reason.trim() } : {}), ...(question.trim() ? { question: question.trim() } : {}) }
    try {
      const result = await decideUniversityAssignment(selected.id, input)
      setAssignments((current) => current.map((item) => item.id === result.assignment.id ? result.assignment : item))
      setDecisionPanel(null)
      setReason(''); setQuestion('')
      if (result.project?.id) { setProjectIds((current) => ({ ...current, [selected.id]: result.project!.id })); localStorage.setItem('civicx_project_id', result.project.id) }
      setNotice(result.reused ? 'This decision was already recorded. The existing project is available below.' : messageFor(next))
    } catch (decisionError) {
      setError(decisionError instanceof Error ? decisionError.message : 'Unable to save the decision. Your response is still available to retry.')
      if (decisionError instanceof Error && decisionError.name === 'ConflictError') await load()
    } finally { setBusy(false) }
  }

  return <section className="university-inbox">
    <div className="university-heading"><div><p className="eyebrow"><span /> University workspace</p><h1>Assignment inbox</h1><p>Review routed civic reports, ask for context, and accept the work your institution can deliver.</p></div><div className="inbox-count"><strong>{pendingCount}</strong> awaiting a decision</div></div>
    <div className="university-filters"><label>Domain<select value={domain} onChange={(event) => setDomain(event.target.value)}>{domains.map((item) => <option key={item}>{item}</option>)}</select></label><label>Status<select value={status} onChange={(event) => setStatus(event.target.value as typeof status)}><option value="All">All assignments</option><option value="pending">Awaiting decision</option><option value="accepted">Accepted</option><option value="declined">Declined</option></select></label><button type="button" onClick={() => void load()} disabled={loading || busy}>↻ Refresh</button></div>
    {notice && <p className="university-notice" role="status">{notice}</p>}{error && <p className="university-error" role="alert">{error}</p>}
    {loading ? <p className="university-empty">Loading routed reports…</p> : !assignments.length ? <p className="university-empty">No assignments have been routed to your institution yet.</p> : <div className="inbox-layout"><div className="challenge-list">{filtered.length ? filtered.map((assignment) => <button type="button" className={`challenge-row ${selected?.id === assignment.id ? 'selected' : ''}`} key={assignment.id} onClick={() => { setSelectedId(assignment.id); setDecisionPanel(null); setError('') }}><span className={`priority-dot priority-${assignment.report?.analysis?.priority ?? 'medium'}`} /><span><strong>{assignment.report?.title ?? 'Report unavailable'}</strong><small>{assignment.departmentName} · {assignment.report?.domain ?? 'Domain unavailable'}</small><small className="assignment-status">{assignment.status.replace('_', ' ')} · routed {formatDate(assignment.createdAt)}</small></span><span className="challenge-row-arrow">→</span></button>) : <p className="university-empty">No assignments match these filters.</p>}</div>{selected && <article className="challenge-detail"><div className="detail-top"><span className={`priority-label priority-label-${selected.report?.analysis?.priority ?? 'medium'}`}>{selected.report?.analysis?.priority ?? 'medium'} priority</span><span className={`decision-label decision-${selected.status}`}>{selected.status.replace('_', ' ')}</span></div><h2>{selected.report?.title ?? 'Report unavailable'}</h2><p className="detail-summary">{selected.report?.description ?? 'The original report is no longer available to this assignment.'}</p><div className="detail-meta"><span><small>Location</small><strong>{selected.report?.location ?? 'Unavailable'}</strong></span><span><small>Department</small><strong>{selected.departmentName}</strong></span><span><small>Routed</small><strong>{formatDate(selected.createdAt)}</strong></span></div>{selected.reason && <div className="assignment-note"><small>Administrator context</small><p>{selected.reason}</p></div>}<div className="match-section"><div className="section-title"><h3>Why this was routed here</h3><span>Match score {selected.matchSnapshot.score}/100</span></div>{selected.matchSnapshot.components.filter((component) => component.points > 0).map((component) => <div className="match-row" key={component.name}><span><strong>{component.name}</strong><small>{component.reasons.join(' · ')}</small></span><b>{component.points}/{component.maximum}</b></div>)}{!selected.matchSnapshot.components.some((component) => component.points > 0) && <p className="university-empty">No match factors were recorded.</p>}</div>{selected.clarification?.question && <div className="clarification-box"><small>Clarification requested</small><p>{selected.clarification.question}</p></div>}{selected.status === 'accepted' && projectIds[selected.id] && <div className="accepted-project"><div><small>Project created</small><strong>Your team can start with the proposed stage.</strong></div><button type="button" onClick={() => { localStorage.setItem('civicx_project_id', projectIds[selected.id]); window.location.hash = '/projects' }}>Open project →</button></div>}{selected.status === 'pending' && <div className="decision-actions"><button type="button" className="decision-secondary" disabled={busy} onClick={() => openDecision('info_requested')}>Request clarification</button><button type="button" className="decision-danger" disabled={busy} onClick={() => openDecision('declined')}>Decline assignment</button><button type="button" className="decision-primary" disabled={busy} onClick={() => void decide('accepted')}>{busy ? 'Accepting…' : 'Accept assignment →'}</button></div>}{decisionPanel && <form className="decision-panel" onSubmit={(event: FormEvent) => { event.preventDefault(); void decide(decisionPanel) }}><div className="proposal-heading"><div><span className="panel-label">{decisionPanel === 'declined' ? 'Decline assignment' : 'Request clarification'}</span><h3>{decisionPanel === 'declined' ? 'Tell the administrator why.' : 'What does your team need to assess it?'}</h3></div><button type="button" onClick={() => setDecisionPanel(null)}>×</button></div>{decisionPanel === 'declined' ? <label>Reason<textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={3} placeholder="Explain capacity, scope, or capability constraints." required /></label> : <label>Question<textarea value={question} onChange={(event) => setQuestion(event.target.value)} rows={3} placeholder="Ask for the detail your institution needs." required /></label>}<button className="proposal-save" type="submit" disabled={busy}>{busy ? 'Sending…' : decisionPanel === 'declined' ? 'Decline assignment' : 'Send clarification request'} <span>→</span></button></form>}</article>}</div>}
  </section>
}
