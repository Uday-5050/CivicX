import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { getAdminSubmission, getAdminSubmissionAnalysis, getUniversityRecommendations, listAdminModeration, retryAdminSubmissionAnalysis, reviewAdminSubmission, routeSubmission } from '../../api/admin.api'
import type { AdminClassificationAnalysis, AdminModerationItem, AdminReviewDecision, AdminSubmissionDetail, UniversityRecommendationResult } from '../../api/types'
import './AdminModerationWorkspace.css'

const formatDate = (value: unknown) => {
  const date = new Date(String(value ?? ''))
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(date)
}

const errorMessage = (error: unknown, fallback: string) => error instanceof Error ? error.message : fallback

const isActiveSubmission = (detail: AdminSubmissionDetail) => (detail.submission.disposition ?? 'active') === 'active'

export default function AdminModerationWorkspace() {
  const [queue, setQueue] = useState<AdminModerationItem[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [detail, setDetail] = useState<AdminSubmissionDetail | null>(null)
  const [recommendations, setRecommendations] = useState<UniversityRecommendationResult | null>(null)
  const [analysis, setAnalysis] = useState<AdminClassificationAnalysis | null>(null)
  const [search, setSearch] = useState('')
  const [decision, setDecision] = useState<AdminReviewDecision>('reviewed')
  const [note, setNote] = useState('')
  const [question, setQuestion] = useState('')
  const [duplicateOf, setDuplicateOf] = useState('')
  const [category, setCategory] = useState('')
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | ''>('')
  const [institutionId, setInstitutionId] = useState('')
  const [departmentId, setDepartmentId] = useState('')
  const [routeReason, setRouteReason] = useState('')
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  const loadQueue = async () => {
    try {
      const nextQueue = await listAdminModeration()
      setQueue(nextQueue)
      setSelectedId((current) => current || nextQueue[0]?.id || '')
      setError('')
    } catch (loadError) {
      setError(errorMessage(loadError, 'Unable to load the moderation queue.'))
    } finally { setLoading(false) }
  }

  const loadDetail = async (id: string) => {
    if (!id) { setDetail(null); return }
    setDetailLoading(true)
    setNotice('')
    setError('')
    setRecommendations(null)
    setDecision('reviewed'); setNote(''); setQuestion(''); setDuplicateOf(''); setCategory(''); setPriority('')
    setInstitutionId(''); setDepartmentId(''); setRouteReason('')
    try { const [nextDetail, nextAnalysis] = await Promise.all([getAdminSubmission(id), getAdminSubmissionAnalysis(id)]); setDetail(nextDetail); setAnalysis(nextAnalysis) } catch (loadError) { setDetail(null); setAnalysis(null); setError(errorMessage(loadError, 'Unable to load this report.')) } finally { setDetailLoading(false) }
  }

  useEffect(() => { void loadQueue() }, [])
  useEffect(() => { void loadDetail(selectedId) }, [selectedId])

  const visibleQueue = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return queue
    return queue.filter((item) => `${item.title} ${item.reason} ${item.reporter}`.toLowerCase().includes(query))
  }, [queue, search])

  const selectedCandidate = recommendations?.candidates.find((candidate) => candidate.institutionId === institutionId)
  const activeRouting = detail?.routing.find((assignment) => assignment.status === 'pending' || assignment.status === 'accepted')
  const canRoute = Boolean(detail && detail.submission.status === 'under_review' && isActiveSubmission(detail) && !activeRouting)

  const refreshSelected = async () => {
    if (!selectedId) return
    await loadDetail(selectedId)
    await loadQueue()
  }

  const submitReview = async (event: FormEvent) => {
    event.preventDefault()
    if (!selectedId) return
    if (decision === 'information_requested' && !question.trim()) { setError('Add the question the citizen must answer.'); return }
    if (decision === 'marked_duplicate' && !duplicateOf.trim()) { setError('Enter the related report ID before marking this duplicate.'); return }
    setBusy(true); setError(''); setNotice('')
    const input = {
      decision,
      ...(note.trim() ? { note: note.trim() } : {}),
      ...(category.trim() ? { category: category.trim() } : {}),
      ...(priority ? { priority } : {}),
      ...(duplicateOf.trim() ? { duplicateOf: duplicateOf.trim() } : {}),
      ...(question.trim() ? { question: question.trim() } : {}),
    }
    try { await reviewAdminSubmission(selectedId, input); setNotice('Review decision recorded.'); await refreshSelected() } catch (reviewError) { setError(errorMessage(reviewError, 'The review could not be recorded. Your form is still available to retry.')) } finally { setBusy(false) }
  }

  const findMatches = async () => {
    if (!selectedId) return
    setBusy(true); setError(''); setNotice('')
    try { const result = await getUniversityRecommendations(selectedId); setRecommendations(result); setInstitutionId(result.candidates[0]?.institutionId ?? ''); setDepartmentId(''); setNotice(result.noMatch ? 'No eligible university match was found. Review readiness or route with an explicit reason.' : 'University matches are ready for review.') } catch (matchError) { setError(errorMessage(matchError, 'Unable to calculate university matches.')) } finally { setBusy(false) }
  }

  const submitRoute = async (event: FormEvent) => {
    event.preventDefault()
    if (!selectedId || !institutionId || !departmentId) { setError('Choose a university and an active department before routing.'); return }
    setBusy(true); setError(''); setNotice('')
    try { await routeSubmission(selectedId, { institutionId, departmentId, ...(routeReason.trim() ? { reason: routeReason.trim() } : {}) }); setNotice('Report routed to the selected university.'); await refreshSelected() } catch (routeError) { setError(errorMessage(routeError, 'Routing failed. The report and your selections were preserved.')) } finally { setBusy(false) }
  }

  const retryAnalysis = async () => {
    if (!selectedId) return
    setBusy(true); setError(''); setNotice('')
    try { await retryAdminSubmissionAnalysis(selectedId, { reason: 'Administrator requested a fresh analysis', expectedRevision: analysis?.current?.revision ?? 0 }); setNotice('Analysis retry queued. It will run in the background.'); await loadDetail(selectedId) } catch (retryError) { setError(errorMessage(retryError, 'Analysis could not be queued.')) } finally { setBusy(false) }
  }

  return <section className="admin-moderation-workspace">
    <div className="admin-moderation-heading"><div><p className="section-kicker">06 <strong>Moderation and routing</strong></p><h2>Read the report. Explain the decision. Route with evidence.</h2><p>Every report stays intact while an administrator records the review and chooses an eligible university.</p></div><button type="button" onClick={() => void loadQueue()} disabled={loading || busy}>↻ Refresh queue</button></div>
    {notice && <p className="admin-moderation-notice" role="status">{notice}</p>}
    {error && <p className="admin-moderation-error" role="alert">{error}</p>}
    <div className="admin-moderation-layout">
      <aside className="admin-moderation-queue"><div className="admin-moderation-queue-head"><div><span className="admin-moderation-label">Open work</span><strong>{queue.length}</strong></div><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search reports" aria-label="Search moderation reports" /></div>{loading ? <p className="admin-moderation-empty">Loading moderation queue…</p> : visibleQueue.length ? <div className="admin-moderation-queue-list">{visibleQueue.map((item) => <button type="button" key={item.id} className={item.id === selectedId ? 'selected' : ''} onClick={() => setSelectedId(item.id)}><span><strong>{item.title}</strong><small>{item.reason}</small><small>{formatDate(item.createdAt)}</small></span><b>›</b></button>)}</div> : <p className="admin-moderation-empty">No reports match this search.</p>}</aside>
      <div className="admin-moderation-main">{detailLoading ? <div className="admin-moderation-card"><p className="admin-moderation-empty">Loading report detail…</p></div> : !detail ? <div className="admin-moderation-card"><p className="admin-moderation-empty">Select a report to begin review.</p></div> : <>
        <article className="admin-moderation-card admin-analysis-card"><div className="admin-moderation-card-head"><div><span className="admin-moderation-label">AI recommendation</span><h3>Suggested classification</h3><p>This is advisory. Your review remains authoritative.</p></div><button type="button" onClick={() => void retryAnalysis()} disabled={busy || analysis?.job?.status === 'pending' || analysis?.job?.status === 'running'}>Retry analysis</button></div><div className="admin-analysis-grid"><div><small>Status</small><strong>{analysis?.job?.status ?? detail.submission.analysis?.status ?? 'not queued'}</strong></div><div><small>Provider</small><strong>{analysis?.current?.provider ?? analysis?.job?.requestedProvider ?? 'pending'}</strong></div><div><small>Model</small><strong>{analysis?.current?.model ?? 'pending'}</strong></div><div><small>Revision</small><strong>{analysis?.current?.revision ?? 0}</strong></div></div>{analysis?.current ? <p>{analysis.current.summary}<br /><b>{analysis.current.category}</b> · {analysis.current.priority} priority</p> : <p>Analysis is pending or unavailable. The report can still be reviewed manually.</p>}{analysis?.current?.fallbackReason && <small className="admin-analysis-warning">Gemini was unavailable ({analysis.current.fallbackReason}); local rules produced this recommendation.</small>}</article>
        <article className="admin-moderation-card admin-report-detail"><div className="admin-moderation-card-head"><div><span className="admin-moderation-label">Citizen report</span><h3>{detail.submission.title}</h3><p>{formatDate(detail.submission.createdAt)} · {detail.submission.location}</p></div><div className="admin-report-badges"><span className="admin-status admin-under_review">{detail.submission.status.replace('_', ' ')}</span><span className="admin-status admin-{detail.submission.disposition ?? 'active'}">{detail.submission.disposition ?? 'active'}</span></div></div><div className="admin-report-copy"><p>{detail.submission.description}</p><dl><div><dt>Domain</dt><dd>{detail.submission.domain}</dd></div><div><dt>Priority</dt><dd>{detail.submission.analysis?.priority ?? 'Not set'}</dd></div><div><dt>Category</dt><dd>{detail.submission.analysis?.category ?? 'Not set'}</dd></div></dl></div>{detail.submission.attachments?.length ? <div className="admin-attachment-list"><strong>Attachments</strong>{detail.submission.attachments.map((attachment) => <div key={attachment.id}><span>{attachment.name}</span><small>{attachment.type} · {Math.round(attachment.size / 1024)} KB</small>{attachment.previewUrl ? <a href={attachment.previewUrl} target="_blank" rel="noreferrer">Open authorized file ↗</a> : <small>Preview unavailable</small>}</div>)}</div> : null}<div className="admin-timeline"><strong>Timeline</strong>{detail.timeline.length ? detail.timeline.map((event, index) => <div key={String(event.eventId ?? event.id ?? index)}><span /><div><p>{typeof event.message === 'string' ? event.message : 'Report update recorded'}</p><small>{formatDate(event.createdAt)}{typeof event.actorRole === 'string' ? ` · ${event.actorRole}` : ''}</small></div></div>) : <p className="admin-moderation-empty">No activity recorded yet.</p>}</div></article>
        <form className="admin-moderation-card admin-review-form" onSubmit={(event) => void submitReview(event)}><div className="admin-moderation-card-head"><div><span className="admin-moderation-label">Decision record</span><h3>What should happen next?</h3></div><span className="admin-form-hint">Server validates every transition</span></div><div className="admin-form-grid"><label>Decision<select value={decision} onChange={(event) => setDecision(event.target.value as AdminReviewDecision)}><option value="reviewed">Reviewed — keep processing</option><option value="information_requested">Request information</option><option value="marked_duplicate">Mark as duplicate</option><option value="referred">Refer for further handling</option><option value="rejected">Reject report</option><option value="restored">Restore report</option></select></label><label>Priority<select value={priority} onChange={(event) => setPriority(event.target.value as typeof priority)}><option value="">Keep current</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label><label>Category<input value={category} onChange={(event) => setCategory(event.target.value)} placeholder="Optional category correction" /></label>{decision === 'marked_duplicate' && <label>Related report ID<input value={duplicateOf} onChange={(event) => setDuplicateOf(event.target.value)} placeholder="MongoDB report ID" required /></label>}{decision === 'information_requested' && <label className="wide-field">Question for citizen<textarea value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="What information is needed?" rows={3} required /></label>}<label className="wide-field">Internal note<textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Explain the decision for the audit trail" rows={3} /></label></div><button className="admin-moderation-primary" type="submit" disabled={busy}>{busy ? 'Saving decision…' : 'Record decision'} <span>→</span></button></form>
        <article className="admin-moderation-card admin-routing-card"><div className="admin-moderation-card-head"><div><span className="admin-moderation-label">University handoff</span><h3>Find the right institution.</h3><p>Matches are recommendations. The administrator remains responsible for the route.</p></div><button type="button" onClick={() => void findMatches()} disabled={busy || !canRoute}>{busy ? 'Checking…' : 'Find university matches'}</button></div>{activeRouting && <div className="admin-existing-route"><strong>Already routed</strong><span>{activeRouting.departmentName} · {activeRouting.status}</span><small>{activeRouting.reason || 'No routing note recorded.'}</small></div>}{!canRoute && !activeRouting && <p className="admin-moderation-empty">Review the report and keep its disposition active before routing.</p>}{recommendations && <div className="admin-recommendation-area">{recommendations.noMatch ? <><p className="admin-moderation-empty">No recommendation matched this report. If you have verified an eligible target, an explicit reason is required for an override.</p><form className="admin-route-form" onSubmit={(event) => void submitRoute(event)}><label>Institution ID<input value={institutionId} onChange={(event) => setInstitutionId(event.target.value)} placeholder="Verified university ID" required /></label><label>Active department ID<input value={departmentId} onChange={(event) => setDepartmentId(event.target.value)} placeholder="Department ID" required /></label><label className="wide-field">Override reason<textarea value={routeReason} onChange={(event) => setRouteReason(event.target.value)} rows={2} placeholder="Explain why this eligible target should receive the report" required /></label><button className="admin-moderation-primary" type="submit" disabled={busy}>{busy ? 'Routing…' : 'Route with explicit reason'} <span>→</span></button></form></> : <><div className="admin-recommendation-list">{recommendations.candidates.map((candidate) => <button type="button" key={candidate.institutionId} className={candidate.institutionId === institutionId ? 'selected' : ''} onClick={() => { setInstitutionId(candidate.institutionId); setDepartmentId('') }}><span><strong>{candidate.institutionName}</strong><small>Score {candidate.score}/100 · {candidate.availableCapacity} slots available</small><small>{candidate.components.filter((component) => component.points > 0).map((component) => component.name).join(' · ') || 'No positive match factors'}</small></span><b>{candidate.score}</b></button>)}</div>{selectedCandidate && <form className="admin-route-form" onSubmit={(event) => void submitRoute(event)}><label>Department<select value={departmentId} onChange={(event) => setDepartmentId(event.target.value)} required><option value="">Choose an active department</option>{selectedCandidate.departments.map((department) => <option key={department.id} value={department.id}>{department.name}{department.domains.length ? ` · ${department.domains.join(', ')}` : ''}</option>)}</select></label><label>Routing reason (optional)<textarea value={routeReason} onChange={(event) => setRouteReason(event.target.value)} rows={2} placeholder="Add context for the university" /></label><button className="admin-moderation-primary" type="submit" disabled={busy}>{busy ? 'Routing…' : `Route to ${selectedCandidate.institutionName}`} <span>→</span></button></form>}</>}</div>}</article>
      </>}</div>
    </div>
  </section>
}
