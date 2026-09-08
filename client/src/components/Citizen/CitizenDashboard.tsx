import { useEffect, useMemo, useState } from 'react'
import { listSubmissions } from '../../api/submissions.api'
import type { Submission, SubmissionStatus } from '../../api/types'
import './CitizenDashboard.css'

type Filter = 'all' | SubmissionStatus

const statusCopy: Record<SubmissionStatus, { label: string; detail: string }> = {
  draft: { label: 'Draft', detail: 'Saved locally and not sent to the review team.' },
  submitted: { label: 'Submitted', detail: 'Your report has been received and is waiting for review.' },
  under_review: { label: 'Under review', detail: 'The CivicX review team is checking the report and its evidence.' },
  resolved: { label: 'Resolved', detail: 'This report has been marked resolved.' },
}

const formatDate = (value: string) => new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value))
const formatFileSize = (bytes: number) => bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`

export default function CitizenDashboard({ onCreateReport }: { onCreateReport: () => void }) {
  const [reports, setReports] = useState<Submission[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('all')
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const next = await listSubmissions()
      setReports(next)
      setSelectedId((current) => current && next.some((report) => report.id === current) ? current : next[0]?.id ?? null)
      setNotice('')
    } catch {
      setReports([])
      setSelectedId(null)
      setNotice('Your reports could not be loaded. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const summary = useMemo(() => ({
    total: reports.length,
    reviewing: reports.filter((report) => report.status === 'under_review').length,
    resolved: reports.filter((report) => report.status === 'resolved').length,
  }), [reports])
  const visibleReports = filter === 'all' ? reports : reports.filter((report) => report.status === filter)
  const selected = reports.find((report) => report.id === selectedId) ?? null

  return <section className="citizen-dashboard">
    <div className="citizen-dashboard-heading">
      <div>
        <p className="eyebrow"><span /> My CivicX</p>
        <h1>Follow every report.</h1>
        <p>See what you have raised, where it is in review, and the evidence attached to it.</p>
      </div>
      <div className="citizen-dashboard-actions">
        <button type="button" className="tracker-refresh" onClick={() => void load()} disabled={loading}>↻ Refresh</button>
        <button type="button" className="tracker-primary" onClick={onCreateReport}>Raise a report <span>→</span></button>
      </div>
    </div>

    <div className="tracker-summary" aria-label="Report summary">
      <article><small>Total reports</small><strong>{summary.total}</strong><span>Submitted by you</span></article>
      <article><small>Under review</small><strong>{summary.reviewing}</strong><span>With the CivicX team</span></article>
      <article><small>Resolved</small><strong>{summary.resolved}</strong><span>Marked complete</span></article>
    </div>

    {notice && <p className="tracker-notice" role="alert">{notice}</p>}
    {loading ? <p className="tracker-loading">Loading your reports…</p> : reports.length === 0 && !notice ? <section className="tracker-empty"><span>⌁</span><h2>No reports yet.</h2><p>Raise a local challenge and it will appear here once it is submitted.</p><button type="button" className="tracker-primary" onClick={onCreateReport}>Raise your first report <span>→</span></button></section> : <div className="tracker-layout">
      <section className="tracker-list-panel">
        <div className="tracker-list-heading">
          <div><p className="section-kicker">01 <strong>Your reports</strong></p><h2>What you have raised.</h2></div>
          <label>Show<select value={filter} onChange={(event) => setFilter(event.target.value as Filter)} aria-label="Filter your reports"><option value="all">All reports</option><option value="submitted">Submitted</option><option value="under_review">Under review</option><option value="resolved">Resolved</option></select></label>
        </div>
        <div className="tracker-report-list">
          {visibleReports.length ? visibleReports.map((report) => <button type="button" className={report.id === selectedId ? 'tracker-report selected' : 'tracker-report'} key={report.id} onClick={() => setSelectedId(report.id)}>
            <span className={`tracker-status-dot tracker-${report.status}`} />
            <span><small>{report.domain} · {formatDate(report.createdAt)}</small><strong>{report.title}</strong><em>{statusCopy[report.status].label}</em></span>
            <b>→</b>
          </button>) : <p className="tracker-empty-filter">No reports match this filter.</p>}
        </div>
      </section>

      {selected && <article className="tracker-detail">
        <div className="tracker-detail-top"><span className={`tracker-status tracker-${selected.status}`}>{statusCopy[selected.status].label}</span><time>Raised {formatDate(selected.createdAt)}</time></div>
        <p className="section-kicker">02 <strong>Report detail</strong></p>
        <h2>{selected.title}</h2>
        <p className="tracker-description">{selected.description}</p>
        <div className="tracker-meta"><span><small>Domain</small><strong>{selected.domain}</strong></span><span><small>Location</small><strong>{selected.location}</strong></span><span><small>Discussion</small><strong>{selected.comments} comments</strong></span></div>
        <div className="tracker-stage"><span className={`tracker-stage-icon tracker-${selected.status}`}>✓</span><div><strong>{statusCopy[selected.status].label}</strong><p>{statusCopy[selected.status].detail}</p></div></div>
        <section className="tracker-analysis"><div><span>✦</span><strong>Classification</strong></div>{selected.analysis.status === 'completed' ? <p>{selected.analysis.summary ?? 'Classification is ready.'}<br /><b>{selected.analysis.category ?? 'Category pending'}</b> · {selected.analysis.priority ?? 'Priority pending'} priority</p> : <p>{selected.analysis.status === 'failed' ? 'Classification is temporarily unavailable. Your report is still available for review.' : 'Classification is being prepared.'}</p>}</section>
        <section className="tracker-attachments"><div className="tracker-subheading"><h3>Evidence</h3><span>{selected.attachments.length} files</span></div>{selected.attachments.length ? <div>{selected.attachments.map((attachment) => <a key={attachment.id} href={attachment.previewUrl} target="_blank" rel="noreferrer"><span>↗</span><strong>{attachment.name}</strong><small>{attachment.type || 'File'} · {formatFileSize(attachment.size)}</small></a>)}</div> : <p>No attachments were added to this report.</p>}</section>
      </article>}
    </div>}
  </section>
}
