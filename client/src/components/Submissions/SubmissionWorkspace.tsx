import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { addSubmissionComment, classifySubmission, createSubmission, listSubmissions } from '../../api/submissions.api'
import type { Submission, SubmissionAnalysis, SubmissionAttachment } from '../../api/types'
import type { Role } from '../../constants/roles'
import './SubmissionWorkspace.css'

type FormState = { title: string; description: string; domain: string; location: string }
const initialForm: FormState = { title: '', description: '', domain: 'Public safety', location: '' }
const domains = ['Public safety', 'Roads and transport', 'Water and sanitation', 'Health and education', 'Environment', 'Other']

function formatDate(value: string) { return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' }).format(new Date(value)) }

export default function SubmissionWorkspace({ role }: { role: Role }) {
  const [form, setForm] = useState(initialForm)
  const [attachments, setAttachments] = useState<SubmissionAttachment[]>([])
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([])
  const [analysis, setAnalysis] = useState<SubmissionAnalysis>({ status: 'pending' })
  const [analysisMessage, setAnalysisMessage] = useState('Add a title and description to preview classification.')
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [filter, setFilter] = useState('All')
  const [busy, setBusy] = useState(false)
  const [duplicate, setDuplicate] = useState<Submission | null>(null)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [commentFor, setCommentFor] = useState<string | null>(null)
  const [comment, setComment] = useState('')
  const sequence = useRef(0)

  useEffect(() => { void listSubmissions().then(setSubmissions) }, [])

  useEffect(() => {
    if (!form.title.trim() || form.description.trim().length < 20) {
      setAnalysis({ status: 'pending' }); setAnalysisMessage('Add a title and at least 20 characters to preview classification.'); return
    }
    const currentSequence = ++sequence.current
    setAnalysis({ status: 'pending' }); setAnalysisMessage('AI is reviewing the draft...')
    const timer = window.setTimeout(() => {
      void classifySubmission(form).then((result) => {
        if (currentSequence !== sequence.current) return
        setAnalysis(result); setAnalysisMessage(result.summary ?? 'Classification preview ready.')
      }).catch(() => {
        if (currentSequence !== sequence.current) return
        setAnalysis({ status: 'failed', error: 'Analysis is temporarily unavailable.' }); setAnalysisMessage('You can still submit this report. Analysis will be retried after submission.')
      })
    }, 500)
    return () => window.clearTimeout(timer)
  }, [form])

  const update = (key: keyof FormState, value: string) => setForm((current) => ({ ...current, [key]: value }))
  const onFiles = (files: FileList | null) => {
    if (!files) return
    const selected = Array.from(files).slice(0, 5)
    const next = selected.map((file) => ({ id: `${file.name}-${file.lastModified}`, name: file.name, type: file.type, size: file.size, previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined }))
    setAttachments((current) => [...current, ...next].slice(0, 5))
    setAttachmentFiles((current) => [...current, ...selected].slice(0, 5))
  }
  const removeFile = (id: string) => { setAttachments((current) => current.filter((attachment) => attachment.id !== id)); setAttachmentFiles((current) => current.filter((file) => `${file.name}-${file.lastModified}` !== id)) }
  const submit = async (confirmed = false) => {
    setError(''); setSuccess('')
    if (!form.title.trim() || form.description.trim().length < 20 || !form.location.trim()) { setError('Add a title, a detailed description, and a location before submitting.'); return }
    const idempotencyKey = `${form.title.trim().toLowerCase()}-${form.location.trim().toLowerCase()}`.replace(/[^a-z0-9]+/g, '-').slice(0, 80)
    const existing = submissions.find((submission) => submission.idempotencyKey === idempotencyKey)
    if (existing && !confirmed) { setDuplicate(existing); return }
    setBusy(true)
    try {
      const created = await createSubmission({ ...form, submitterType: role, attachments, files: attachmentFiles, idempotencyKey })
      const withAnalysis = analysis.status === 'completed' ? { ...created, analysis } : created
      setSubmissions((current) => [withAnalysis, ...current.filter((submission) => submission.id !== withAnalysis.id)])
      setForm(initialForm); setAttachments([]); setAttachmentFiles([]); setAnalysis({ status: 'pending' }); setSuccess('Submission saved. You can track it below.'); setDuplicate(null)
    } catch { setError('We could not save this submission. Your form data is still here; please retry.') }
    finally { setBusy(false) }
  }
  const upvote = (id: string) => setSubmissions((current) => current.map((submission) => submission.id === id ? { ...submission, hasUpvoted: !submission.hasUpvoted, upvotes: submission.upvotes + (submission.hasUpvoted ? -1 : 1) } : submission))
  const submitComment = async (id: string) => { if (!comment.trim()) return; await addSubmissionComment(id, comment.trim()); setSubmissions((current) => current.map((submission) => submission.id === id ? { ...submission, comments: submission.comments + 1 } : submission)); setComment(''); setCommentFor(null) }
  const filtered = filter === 'All' ? submissions : submissions.filter((submission) => submission.domain === filter)

  return <section className="submission-workspace">
    <div className="submission-heading"><div><p className="eyebrow"><span /> Citizen submissions</p><h2>Turn a concern into action.</h2><p>Describe what is happening. CivicX will help route it to the right people.</p></div><span className="submission-count">{submissions.length} reports in the community</span></div>
    <div className="submission-layout">
      <form className="submission-form" onSubmit={(event: FormEvent) => { event.preventDefault(); void submit() }}>
        <div className="section-kicker">01 <strong>Tell us what is happening</strong></div>
        <label>Title<input value={form.title} onChange={(event) => update('title', event.target.value)} placeholder="Give your issue a clear title" maxLength={120} required /></label>
        <label>Description<textarea value={form.description} onChange={(event) => update('description', event.target.value)} placeholder="Share the details, impact, and anything that could help resolve it..." rows={6} minLength={20} required /><small>{form.description.length}/2000 characters</small></label>
        <div className="submission-fields"><label>Domain<select value={form.domain} onChange={(event) => update('domain', event.target.value)}>{domains.map((domain) => <option key={domain}>{domain}</option>)}</select></label><label>Location<input value={form.location} onChange={(event) => update('location', event.target.value)} placeholder="City, ward, or landmark" required /></label></div>
        <label className="upload-zone"><input type="file" accept="image/*,.pdf,.doc,.docx" multiple onChange={(event) => onFiles(event.target.files)} /><span className="upload-icon">+</span><strong>Attach photos or documents</strong><small>Up to 5 files, 10 MB each</small></label>
        {attachments.length > 0 && <div className="attachment-list">{attachments.map((attachment) => <div className="attachment" key={attachment.id}>{attachment.previewUrl ? <img src={attachment.previewUrl} alt="" /> : <span className="file-icon">DOC</span>}<span>{attachment.name}</span><button type="button" onClick={() => removeFile(attachment.id)} aria-label={`Remove ${attachment.name}`}>×</button></div>)}</div>}
        {error && <p className="submission-error" role="alert">{error}</p>}{success && <p className="submission-success" role="status">✓ {success}</p>}
        <button className="submit-button" type="submit" disabled={busy}>{busy ? 'Saving submission...' : 'Submit report'} <span>→</span></button>
      </form>
      <aside className={`analysis-panel analysis-${analysis.status}`}><div className="analysis-header"><span className="analysis-spark">✦</span><div><strong>AI classification preview</strong><small>Debounced draft analysis</small></div><span className={`analysis-status analysis-status-${analysis.status}`}>{analysis.status}</span></div><p>{analysisMessage}</p>{analysis.status === 'completed' && <div className="analysis-result"><div><small>Category</small><strong>{analysis.category}</strong></div><div><small>Priority</small><strong className={`priority-${analysis.priority}`}>{analysis.priority}</strong></div></div>}<small className="analysis-note">This is a preview. Final routing may change after review.</small></aside>
    </div>
    {duplicate && <div className="duplicate-warning" role="alert"><strong>This report looks like an existing submission.</strong><p>We found “{duplicate.title}”. Your form is preserved.</p><button type="button" onClick={() => void submit(true)}>Submit anyway</button><button type="button" onClick={() => setDuplicate(null)}>Keep editing</button></div>}
    <div className="feed-heading"><div><p className="eyebrow"><span /> Community feed</p><h2>See what your neighbours are raising.</h2></div><select value={filter} onChange={(event) => setFilter(event.target.value)} aria-label="Filter submissions"><option>All</option>{domains.map((domain) => <option key={domain}>{domain}</option>)}</select></div>
    <div className="submission-feed">{filtered.map((submission) => <article className="submission-card" key={submission.id}><div className="submission-card-top"><span className="feed-domain">{submission.domain}</span><time>{formatDate(submission.createdAt)}</time></div><h3>{submission.title}</h3><p>{submission.description}</p><div className="submission-card-bottom"><span className={`status-label status-${submission.status}`}>{submission.status.replace('_', ' ')}</span><button type="button" className={submission.hasUpvoted ? 'upvoted' : ''} onClick={() => upvote(submission.id)}>↑ {submission.upvotes}</button><button type="button" onClick={() => setCommentFor(commentFor === submission.id ? null : submission.id)}>◌ {submission.comments}</button></div>{commentFor === submission.id && <div className="comment-box"><input value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Add a thoughtful comment" onKeyDown={(event) => { if (event.key === 'Enter') void submitComment(submission.id) }} /><button type="button" onClick={() => void submitComment(submission.id)}>Post</button></div>}</article>)}</div>
  </section>
}
