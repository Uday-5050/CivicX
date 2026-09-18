import { useEffect, useMemo, useState } from 'react'
import { reviewMilestoneEvidence } from '../../api/admin.api'
import { getProjectBoard, listAuthorizedProjects, listMilestoneEvidence, listMilestoneReviews } from '../../api/projects.api'
import type { MilestoneEvidence, MilestoneReview, ProjectBoard, AuthorizedProjectSummary } from '../../api/types'
import './AdminMilestoneReview.css'

const formatDate = (value: string) => { const date = new Date(value); return Number.isNaN(date.getTime()) ? 'Date unavailable' : new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(date) }

export default function AdminMilestoneReview() {
  const [projects, setProjects] = useState<AuthorizedProjectSummary[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [board, setBoard] = useState<ProjectBoard | null>(null)
  const [evidence, setEvidence] = useState<MilestoneEvidence[]>([])
  const [reviews, setReviews] = useState<MilestoneReview[]>([])
  const [selectedEvidenceId, setSelectedEvidenceId] = useState('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  const loadProjects = async () => {
    setLoading(true); setError('')
    try { const next = await listAuthorizedProjects(); setProjects(next); setSelectedProjectId((current) => current && next.some((item) => item.id === current) ? current : next[0]?.id ?? '') } catch (loadError) { setError(loadError instanceof Error ? loadError.message : 'Unable to load projects for evidence review.') } finally { setLoading(false) }
  }
  const loadProject = async (projectId: string) => {
    if (!projectId) { setBoard(null); setEvidence([]); setReviews([]); return }
    try { const [nextBoard, nextEvidence, nextReviews] = await Promise.all([getProjectBoard(projectId), listMilestoneEvidence(projectId), listMilestoneReviews(projectId)]); setBoard(nextBoard); setEvidence(nextEvidence); setReviews(nextReviews); setSelectedEvidenceId((current) => current && nextEvidence.some((item) => item.evidenceId === current && item.status === 'pending') ? current : nextEvidence.find((item) => item.status === 'pending')?.evidenceId ?? '') } catch (loadError) { setError(loadError instanceof Error ? loadError.message : 'Unable to load milestone evidence.') }
  }
  useEffect(() => { void loadProjects() }, [])
  useEffect(() => { void loadProject(selectedProjectId) }, [selectedProjectId])

  const pending = useMemo(() => evidence.filter((item) => item.status === 'pending'), [evidence])
  const selected = evidence.find((item) => item.evidenceId === selectedEvidenceId)
  const review = async (status: 'approved' | 'rejected') => {
    if (!selected || !board) return
    if (note.trim().length < 5) { setError('Add a review note before recording the decision.'); return }
    setBusy(true); setError(''); setNotice('')
    try { await reviewMilestoneEvidence(board.id, { evidenceId: selected.evidenceId, status, note: note.trim(), expectedVersion: board.version }); setNote(''); await loadProject(board.id); setNotice(status === 'approved' ? 'Evidence approved. The project lead can now advance the milestone.' : 'Evidence rejected. The project lead can submit a new revision.') } catch (reviewError) { setError(reviewError instanceof Error && reviewError.name === 'ConflictError' ? 'The project changed or this evidence was already reviewed. Refresh and retry.' : reviewError instanceof Error ? reviewError.message : 'Unable to record the evidence review.') } finally { setBusy(false) }
  }

  return <section className="admin-milestone-review"><div className="admin-milestone-heading"><div><p className="section-kicker">08 <strong>Milestone evidence</strong></p><h2>Review evidence before a project advances.</h2><p>Evidence decisions are separate from stage advancement. A lead must use an approved review exactly once.</p></div><button type="button" onClick={() => void loadProjects()} disabled={loading || busy}>↻ Refresh</button></div>{notice && <p className="admin-milestone-notice" role="status">{notice}</p>}{error && <p className="admin-milestone-error" role="alert">{error}</p>}{loading ? <p className="admin-milestone-empty">Loading evidence queue…</p> : !projects.length ? <p className="admin-milestone-empty">No projects are available for review.</p> : <div className="admin-milestone-layout"><label className="admin-milestone-project">Project<select value={selectedProjectId} onChange={(event) => setSelectedProjectId(event.target.value)}>{projects.map((project) => <option key={project.id} value={project.id}>{project.title} · {project.currentStage}</option>)}</select></label><div className="admin-milestone-queue">{pending.length ? pending.map((item) => <button type="button" className={item.evidenceId === selectedEvidenceId ? 'selected' : ''} key={item.evidenceId} onClick={() => setSelectedEvidenceId(item.evidenceId)}><span><strong>{item.targetStage} · revision {item.revision}</strong><small>Submitted {formatDate(item.submittedAt)}</small></span><b>›</b></button>) : <p className="admin-milestone-empty">No pending evidence for this project.</p>}</div>{selected && board && <article className="admin-milestone-detail"><div className="admin-milestone-detail-head"><div><span className="evidence-status evidence-pending">pending review</span><h3>{selected.targetStage} · revision {selected.revision}</h3><small>Submitted {formatDate(selected.submittedAt)}</small></div><span className="admin-milestone-version">Project version {board.version}</span></div><p>{selected.note}</p>{selected.links.length > 0 && <div className="admin-milestone-links">{selected.links.map((link) => <a href={link} target="_blank" rel="noreferrer" key={link}>{link}</a>)}</div>}<label>Review note<textarea value={note} onChange={(event) => setNote(event.target.value)} minLength={5} rows={4} placeholder="Explain why the evidence is accepted or what must be corrected." /></label><div className="admin-milestone-actions"><button type="button" disabled={busy} onClick={() => void review('rejected')}>Reject evidence</button><button type="button" disabled={busy} onClick={() => void review('approved')}>{busy ? 'Saving…' : 'Approve evidence'}</button></div></article>}</div>}{board && reviews.length > 0 && <div className="admin-milestone-review-history"><strong>Review history</strong><span>{reviews.length} recorded review{reviews.length === 1 ? '' : 's'}</span></div>}</section>
}
