import { useEffect, useState } from 'react'
import { reviewProjectProposal } from '../../api/admin.api'
import AdminMilestoneReview from './AdminMilestoneReview'
import AdminOutcomeClosure from './AdminOutcomeClosure'
import { listAuthorizedProjects, listProjectProposals } from '../../api/projects.api'
import type { AuthorizedProjectSummary, ProposalRevision } from '../../api/types'
import './AdminProposalReview.css'

function AdminProposalReview() {
  const [projects, setProjects] = useState<AuthorizedProjectSummary[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [proposals, setProposals] = useState<ProposalRevision[]>([])
  const [selectedProposalId, setSelectedProposalId] = useState('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  const loadProjects = async () => {
    try {
      const next = await listAuthorizedProjects()
      setProjects(next)
      setSelectedProjectId((current) => current || next[0]?.id || '')
      setError('')
    } catch (loadError) { setError(loadError instanceof Error ? loadError.message : 'Unable to load projects for proposal review.') } finally { setLoading(false) }
  }
  const loadProposals = async (projectId: string) => {
    if (!projectId) { setProposals([]); return }
    try { const next = await listProjectProposals(projectId); setProposals(next); setSelectedProposalId((current) => current && next.some((item) => item.id === current) ? current : next.find((item) => item.status === 'submitted')?.id ?? next[0]?.id ?? ''); setError('') } catch (loadError) { setError(loadError instanceof Error ? loadError.message : 'Unable to load proposal revisions.') }
  }
  useEffect(() => { void loadProjects() }, [])
  useEffect(() => { void loadProposals(selectedProjectId) }, [selectedProjectId])

  const selected = proposals.find((proposal) => proposal.id === selectedProposalId)
  const review = async (status: 'approved' | 'returned') => {
    if (!selected || selected.status !== 'submitted') return
    if (!note.trim()) { setError('Add a review note before recording the decision.'); return }
    setBusy(true); setError(''); setNotice('')
    try { await reviewProjectProposal(selectedProjectId, selected.id, { status, note: note.trim() }); setNote(''); await loadProposals(selectedProjectId); setNotice(status === 'approved' ? 'Proposal approved.' : 'Proposal returned for revision.') } catch (reviewError) { setError(reviewError instanceof Error ? reviewError.message : 'Unable to record the proposal review.') } finally { setBusy(false) }
  }

  return <section className="admin-proposal-review"><div className="admin-proposal-heading"><div><p className="section-kicker">07 <strong>Proposal review</strong></p><h2>Approve the plan before delivery begins.</h2><p>Returned proposals remain in history so the university can submit a new revision.</p></div><button type="button" onClick={() => void loadProjects()} disabled={loading || busy}>↻ Refresh</button></div>{notice && <p className="admin-proposal-notice" role="status">{notice}</p>}{error && <p className="admin-proposal-error" role="alert">{error}</p>}{loading ? <p className="admin-proposal-empty">Loading proposal queue…</p> : !projects.length ? <p className="admin-proposal-empty">No authorized projects are available.</p> : <div className="admin-proposal-layout"><label className="admin-proposal-project">Project<select value={selectedProjectId} onChange={(event) => setSelectedProjectId(event.target.value)}>{projects.map((project) => <option key={project.id} value={project.id}>{project.title} · {project.department}</option>)}</select></label><div className="admin-proposal-revisions">{proposals.length ? proposals.map((proposal) => <button type="button" className={proposal.id === selectedProposalId ? 'selected' : ''} key={proposal.id} onClick={() => setSelectedProposalId(proposal.id)}><span><strong>Revision {proposal.revision}</strong><small>{proposal.status} · {proposal.authorId}</small></span><b>›</b></button>) : <p className="admin-proposal-empty">No proposal revisions have been submitted.</p>}</div>{selected && <article className="admin-proposal-detail"><div className="admin-proposal-detail-head"><div><span className={`proposal-status proposal-${selected.status}`}>{selected.status}</span><h3>Revision {selected.revision}</h3><small>Submitted {new Date(selected.createdAt).toLocaleString('en-IN')}</small></div><span className="admin-proposal-project-id">{selectedProjectId}</span></div><dl><div><dt>Approach</dt><dd>{selected.approach}</dd></div><div><dt>Timeline</dt><dd>{selected.timeline}</dd></div><div><dt>Beneficiaries</dt><dd>{selected.beneficiaries}</dd></div><div><dt>Root cause</dt><dd>{selected.rootCause}</dd></div><div><dt>Work plan</dt><dd>{selected.workPlan}</dd></div><div><dt>Risks</dt><dd>{selected.risks}</dd></div><div><dt>Resources</dt><dd>{selected.resources}</dd></div></dl>{selected.status === 'submitted' && <div className="admin-proposal-decision"><label>Review note<textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} placeholder="Explain what is ready or what must change." /></label><div><button type="button" className="proposal-return" disabled={busy} onClick={() => void review('returned')}>Return for revision</button><button type="button" className="proposal-approve" disabled={busy} onClick={() => void review('approved')}>Approve proposal →</button></div></div>}{selected.reviews?.map((item) => <div className="admin-proposal-history" key={item.reviewId}><strong>{item.status}</strong><span>{item.note}</span></div>)}</article>}</div>}</section>
}

export default function AdminProposalAndMilestoneReview() { return <><AdminProposalReview /><AdminMilestoneReview /><AdminOutcomeClosure /></> }
