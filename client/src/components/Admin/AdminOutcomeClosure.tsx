import { useEffect, useState, type FormEvent } from 'react'
import { closeProject, listProjectClosures, reopenProject, type CloseProjectInput } from '../../api/admin.api'
import { getProjectBoard, listAuthorizedProjects } from '../../api/projects.api'
import type { AuthorizedProjectSummary, ProjectBoard, ProjectClosure } from '../../api/types'
import './AdminOutcomeClosure.css'

const emptyOutcome: Omit<CloseProjectInput, 'expectedVersion'> = {
  baseline: '', target: '', result: '', unit: '', measurementStart: '', measurementEnd: '', method: '', beneficiaries: '', evidence: [], validationNote: '',
}
const formatDate = (value: string) => { const date = new Date(value); return Number.isNaN(date.getTime()) ? 'Date unavailable' : new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(date) }

export default function AdminOutcomeClosure() {
  const [projects, setProjects] = useState<AuthorizedProjectSummary[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [board, setBoard] = useState<ProjectBoard | null>(null)
  const [closures, setClosures] = useState<ProjectClosure[]>([])
  const [outcome, setOutcome] = useState(emptyOutcome)
  const [reopenReason, setReopenReason] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  const loadProjects = async () => {
    setLoading(true); setError('')
    try { const next = await listAuthorizedProjects(); setProjects(next); setSelectedProjectId((current) => current && next.some((item) => item.id === current) ? current : next[0]?.id ?? '') }
    catch (loadError) { setError(loadError instanceof Error ? loadError.message : 'Unable to load projects for outcome validation.') }
    finally { setLoading(false) }
  }
  const loadProject = async (projectId: string) => {
    if (!projectId) { setBoard(null); setClosures([]); return }
    try { const [nextBoard, nextClosures] = await Promise.all([getProjectBoard(projectId), listProjectClosures(projectId)]); setBoard(nextBoard); setClosures(nextClosures); setError('') }
    catch (loadError) { setError(loadError instanceof Error ? loadError.message : 'Unable to load the project outcome.') }
  }
  useEffect(() => { void loadProjects() }, [])
  useEffect(() => { void loadProject(selectedProjectId) }, [selectedProjectId])

  const setField = (field: keyof typeof outcome, value: string) => setOutcome((current) => ({ ...current, [field]: value }))
  const close = async (event: FormEvent) => {
    event.preventDefault(); if (!board) return
    const evidence = outcome.evidence
    if (board.currentStage !== 'deployed') { setError('The project must reach deployed before it can be closed.'); return }
    if (!evidence.length) { setError('Add at least one outcome evidence link.'); return }
    setBusy(true); setError(''); setNotice('')
    try { await closeProject(board.id, { ...outcome, evidence, expectedVersion: board.version }); await loadProject(board.id); setNotice('Outcome validated and the citizen report has been resolved.'); setOutcome(emptyOutcome) }
    catch (closeError) { setError(closeError instanceof Error && closeError.name === 'ConflictError' ? 'The project changed. Refresh and retry with the latest version.' : closeError instanceof Error ? closeError.message : 'Unable to close the project.') }
    finally { setBusy(false) }
  }
  const reopen = async () => {
    if (!board || board.closureStatus !== 'closed') return
    if (reopenReason.trim().length < 10) { setError('Explain the corrective cycle in at least 10 characters.'); return }
    setBusy(true); setError(''); setNotice('')
    try { await reopenProject(board.id, { reason: reopenReason.trim(), expectedVersion: board.version }); await loadProject(board.id); setReopenReason(''); setNotice('Project reopened for a corrective cycle.') }
    catch (reopenError) { setError(reopenError instanceof Error && reopenError.name === 'ConflictError' ? 'The project changed. Refresh and retry with the latest version.' : reopenError instanceof Error ? reopenError.message : 'Unable to reopen the project.') }
    finally { setBusy(false) }
  }

  return <section className="admin-outcome-closure"><div className="admin-outcome-heading"><div><p className="section-kicker">09 <strong>Outcome and closure</strong></p><h2>Validate the result before resolving the report.</h2><p>Closure is an administrator decision. The deployment handoff, measured result, and validation note are stored together with the report resolution.</p></div><button type="button" onClick={() => void loadProjects()} disabled={loading || busy}>↻ Refresh</button></div>{notice && <p className="admin-outcome-notice" role="status">{notice}</p>}{error && <p className="admin-outcome-error" role="alert">{error}</p>}{loading ? <p className="admin-outcome-empty">Loading outcome queue…</p> : !projects.length ? <p className="admin-outcome-empty">No projects are available for validation.</p> : <><label className="admin-outcome-project">Project<select value={selectedProjectId} onChange={(event) => setSelectedProjectId(event.target.value)}>{projects.map((project) => <option key={project.id} value={project.id}>{project.title} · {project.currentStage}</option>)}</select></label>{board && <div className="admin-outcome-status"><span>Stage <strong>{board.currentStage}</strong></span><span>State <strong>{board.closureStatus ?? 'open'}</strong></span><span>Version <strong>{board.version}</strong></span></div>}{board?.closureStatus !== 'closed' && <form className="admin-outcome-form" onSubmit={(event) => void close(event)}><div className="admin-outcome-form-heading"><h3>Record measured outcome</h3><span>Requires approved deployed evidence</span></div><div className="admin-outcome-grid"><label>Baseline<input value={outcome.baseline} onChange={(event) => setField('baseline', event.target.value)} required /></label><label>Target<input value={outcome.target} onChange={(event) => setField('target', event.target.value)} required /></label><label>Measured result<input value={outcome.result} onChange={(event) => setField('result', event.target.value)} required /></label><label>Unit<input value={outcome.unit} onChange={(event) => setField('unit', event.target.value)} placeholder="% / households / litres" required /></label><label>Measurement start<input type="date" value={outcome.measurementStart} onChange={(event) => setField('measurementStart', event.target.value)} required /></label><label>Measurement end<input type="date" value={outcome.measurementEnd} onChange={(event) => setField('measurementEnd', event.target.value)} required /></label><label className="wide">Method<textarea value={outcome.method} onChange={(event) => setField('method', event.target.value)} rows={3} required /></label><label className="wide">Beneficiaries<textarea value={outcome.beneficiaries} onChange={(event) => setField('beneficiaries', event.target.value)} rows={3} required /></label><label className="wide">Evidence links <small>One URL per line.</small><textarea value={outcome.evidence.join('\n')} onChange={(event) => setOutcome((current) => ({ ...current, evidence: event.target.value.split(/\r?\n|,/).map((item) => item.trim()).filter(Boolean) }))} rows={3} placeholder="https://…" required /></label><label className="wide">Validation note<textarea value={outcome.validationNote} onChange={(event) => setField('validationNote', event.target.value)} rows={3} placeholder="What did the administrator verify?" required /></label></div><button className="admin-outcome-close" type="submit" disabled={busy || board?.currentStage !== 'deployed'}>{busy ? 'Saving…' : 'Validate and close project →'}</button></form>}{board?.closureStatus === 'closed' && <div className="admin-outcome-reopen"><div><h3>Project closed</h3><p>The linked citizen report is resolved. Reopen only when a corrective cycle is required; the closure history remains preserved.</p></div><textarea value={reopenReason} onChange={(event) => setReopenReason(event.target.value)} rows={3} placeholder="Explain why the project needs a corrective cycle." /><button type="button" disabled={busy} onClick={() => void reopen()}>{busy ? 'Saving…' : 'Reopen project'}</button></div>}{board?.outcome && <div className="admin-outcome-summary"><h3>Validated outcome</h3><p><strong>{board.outcome.result} {board.outcome.unit}</strong> against a baseline of {board.outcome.baseline} and target of {board.outcome.target}.</p><small>Validated {board.outcome.validatedAt ? formatDate(board.outcome.validatedAt) : 'date unavailable'} · {board.outcome.beneficiaries}</small></div>}{closures.length > 0 && <div className="admin-outcome-history"><div><strong>Closure history</strong><span>{closures.length} event{closures.length === 1 ? '' : 's'}</span></div>{closures.map((item) => <article key={item.closureId}><span className={`closure-action closure-${item.action}`}>{item.action}</span><div>{item.reason ? <p>{item.reason}</p> : item.outcome ? <p>Validated {item.outcome.result} {item.outcome.unit} against baseline {item.outcome.baseline}.</p> : null}<small>{formatDate(item.createdAt)}</small></div></article>)}</div>}</>}</section>
}
