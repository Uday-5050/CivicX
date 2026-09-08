import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { addSubmissionComment, classifySubmission, createSubmission, listSubmissions } from '../../api/submissions.api'
import type { Submission, SubmissionAnalysis, SubmissionAttachment } from '../../api/types'
import type { Role } from '../../constants/roles'
import LocationPicker from '../LocationPicker/LocationPicker'
import type { LocationData } from '../LocationPicker/LocationPicker'
import './SubmissionWorkspace.css'

type FormState = { title: string; description: string; domain: string; location: string }
type SavedDraft = { form: FormState; locationData: LocationData | null; savedAt: string }

const initialForm: FormState = { title: '', description: '', domain: 'Public safety', location: '' }
const domains = ['Public safety', 'Roads and transport', 'Water and sanitation', 'Health and education', 'Environment', 'Other']
const maxFiles = 5
const maxFileSize = 10 * 1024 * 1024
const acceptedFileTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
const draftKey = 'civicx:submission-draft:v1'

function formatDate(value: string) { return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' }).format(new Date(value)) }
function formatFileSize(bytes: number) { return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB` }
function createIdempotencyKey() { return globalThis.crypto?.randomUUID?.() ?? `submission-${Date.now()}-${Math.random().toString(16).slice(2)}` }

export default function SubmissionWorkspace({ role }: { role: Role }) {
  const [form, setForm] = useState(initialForm)
  const [attachments, setAttachments] = useState<SubmissionAttachment[]>([])
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([])
  const [analysis, setAnalysis] = useState<SubmissionAnalysis>({ status: 'pending' })
  const [analysisMessage, setAnalysisMessage] = useState('Add a title and at least 20 characters to preview classification.')
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [busy, setBusy] = useState(false)
  const [reviewing, setReviewing] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [fileNotice, setFileNotice] = useState('')
  const [draftReady, setDraftReady] = useState(false)
  const [draftSavedAt, setDraftSavedAt] = useState('')
  const [commentFor, setCommentFor] = useState<string | null>(null)
  const [comment, setComment] = useState('')
  const [commentError, setCommentError] = useState('')
  const [locationData, setLocationData] = useState<LocationData | null>(null)
  const [idempotencyKey, setIdempotencyKey] = useState(createIdempotencyKey)
  const sequence = useRef(0)

  useEffect(() => {
    void listSubmissions().then(setSubmissions).catch(() => setSubmissions([]))
    try {
      const saved = localStorage.getItem(draftKey)
      if (saved) {
        const draft = JSON.parse(saved) as SavedDraft
        if (draft?.form && typeof draft.form.title === 'string') {
          setForm({ ...initialForm, ...draft.form })
          setLocationData(draft.locationData ?? null)
          setDraftSavedAt(draft.savedAt ?? '')
        }
      }
    } catch { localStorage.removeItem(draftKey) }
    setDraftReady(true)
  }, [])

  useEffect(() => {
    if (!draftReady) return
    const hasDraft = Boolean(form.title.trim() || form.description.trim() || locationData)
    if (!hasDraft) { localStorage.removeItem(draftKey); setDraftSavedAt(''); return }
    const timer = window.setTimeout(() => {
      const savedAt = new Date().toISOString()
      localStorage.setItem(draftKey, JSON.stringify({ form, locationData, savedAt } satisfies SavedDraft))
      setDraftSavedAt(savedAt)
    }, 400)
    return () => window.clearTimeout(timer)
  }, [draftReady, form, locationData])

  useEffect(() => {
    if (!form.title.trim() || form.description.trim().length < 20) {
      setAnalysis({ status: 'pending' }); setAnalysisMessage('Add a title and at least 20 characters to preview classification.'); return
    }
    const currentSequence = ++sequence.current
    setAnalysis({ status: 'pending' }); setAnalysisMessage('Analysing your draft…')
    const timer = window.setTimeout(() => {
      void classifySubmission(form).then((result) => {
        if (currentSequence !== sequence.current) return
        setAnalysis(result); setAnalysisMessage(result.summary ?? 'Classification preview ready.')
      }).catch(() => {
        if (currentSequence !== sequence.current) return
        setAnalysis({ status: 'failed', error: 'Analysis is temporarily unavailable.' }); setAnalysisMessage('You can still submit. Classification will be retried after submission.')
      })
    }, 500)
    return () => window.clearTimeout(timer)
  }, [form])

  const update = (key: keyof FormState, value: string) => { setForm((current) => ({ ...current, [key]: value })); setReviewing(false); setError('') }
  const setLocation = (value: LocationData | null) => { setLocationData(value); setReviewing(false); setError('') }

  const onFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files ?? [])
    event.target.value = ''
    if (!selected.length) return
    const available = maxFiles - attachmentFiles.length
    const valid = selected.filter((file) => acceptedFileTypes.has(file.type) && file.size <= maxFileSize)
    const invalidCount = selected.length - valid.length
    const chosen = valid.slice(0, Math.max(0, available))
    if (!available) setFileNotice('You can attach up to five files. Remove a file before adding another.')
    else if (invalidCount || valid.length > available) setFileNotice(`Only JPEG, PNG, WebP, PDF, DOC, and DOCX files up to 10 MB are allowed. Added ${chosen.length} file${chosen.length === 1 ? '' : 's'}.`)
    else setFileNotice('')
    if (!chosen.length) return
    const next = chosen.map((file) => ({ id: `${file.name}-${file.lastModified}-${file.size}`, name: file.name, type: file.type, size: file.size, previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined }))
    setAttachments((current) => [...current, ...next])
    setAttachmentFiles((current) => [...current, ...chosen])
    setReviewing(false)
  }

  const removeFile = (id: string) => {
    const attachment = attachments.find((item) => item.id === id)
    if (attachment?.previewUrl?.startsWith('blob:')) URL.revokeObjectURL(attachment.previewUrl)
    setAttachments((current) => current.filter((item) => item.id !== id))
    setAttachmentFiles((current) => current.filter((file) => `${file.name}-${file.lastModified}-${file.size}` !== id))
    setFileNotice('')
    setReviewing(false)
  }

  const isComplete = () => {
    if (!form.title.trim()) { setError('Add a clear title before continuing.'); return false }
    if (form.description.trim().length < 20) { setError('Add at least 20 characters so reviewers can understand the issue.'); return false }
    if (!locationData) { setError('Choose a location on the map, search for one, or use your current location.'); return false }
    return true
  }

  const beginReview = () => { setError(''); setSuccess(''); if (isComplete()) setReviewing(true) }
  const discardDraft = () => { localStorage.removeItem(draftKey); setForm(initialForm); setLocationData(null); setDraftSavedAt(''); setReviewing(false); setError(''); setSuccess('') }

  const submit = async () => {
    if (!isComplete()) { setReviewing(false); return }
    setError(''); setSuccess(''); setBusy(true)
    try {
      const created = await createSubmission({ ...form, location: locationData!.address, submitterType: role, attachments, files: attachmentFiles, idempotencyKey })
      const withAnalysis = analysis.status === 'completed' ? { ...created, analysis } : created
      setSubmissions((current) => [withAnalysis, ...current.filter((submission) => submission.id !== withAnalysis.id)])
      attachments.forEach((attachment) => { if (attachment.previewUrl?.startsWith('blob:')) URL.revokeObjectURL(attachment.previewUrl) })
      localStorage.removeItem(draftKey)
      setForm(initialForm); setAttachments([]); setAttachmentFiles([]); setAnalysis({ status: 'pending' }); setLocationData(null); setReviewing(false); setDraftSavedAt(''); setIdempotencyKey(createIdempotencyKey()); setSuccess('Your report has been submitted. You can follow its status from your dashboard.')
    } catch { setError('We could not save this report. Your draft remains on this device, so you can retry safely.') }
    finally { setBusy(false) }
  }

  const submitComment = async (id: string) => {
    if (!comment.trim()) return
    setCommentError('')
    try {
      await addSubmissionComment(id, comment.trim())
      setSubmissions((current) => current.map((submission) => submission.id === id ? { ...submission, comments: submission.comments + 1 } : submission))
      setComment(''); setCommentFor(null)
    } catch { setCommentError('Your follow-up could not be saved. Please try again.') }
  }

  const steps = [Boolean(form.title.trim() && form.description.trim().length >= 20), Boolean(locationData), reviewing]

  return <section className="submission-workspace">
    <div className="submission-heading"><div><p className="eyebrow"><span /> Raise a civic report</p><h2>Turn a concern into action.</h2><p>Share what happened, where it is, and any evidence that can help the review team.</p></div><a className="submission-tracker-link" href="#/tracker">View my reports →</a></div>
    <ol className="submission-steps" aria-label="Report submission progress"><li className={steps[0] ? 'complete' : 'active'}><b>01</b><span><strong>Describe</strong><small>What happened?</small></span></li><li className={steps[1] ? 'complete' : ''}><b>02</b><span><strong>Locate</strong><small>Where is it?</small></span></li><li className={steps[2] ? 'complete' : ''}><b>03</b><span><strong>Review</strong><small>Check before sending</small></span></li></ol>
    <div className="submission-layout">
      <form className="submission-form" onSubmit={(event: FormEvent) => { event.preventDefault(); if (reviewing) void submit(); else beginReview() }}>
        <div className="submission-form-top"><div className="section-kicker">01 <strong>Tell us what is happening</strong></div>{draftSavedAt && <span className="draft-indicator">Draft saved on this device</span>}</div>
        <label>Title<input value={form.title} onChange={(event) => update('title', event.target.value)} placeholder="For example: Streetlight is not working near the school" maxLength={120} required /><small>{form.title.length}/120 characters</small></label>
        <label>Description<textarea value={form.description} onChange={(event) => update('description', event.target.value)} placeholder="Describe the issue, who it affects, and details that could help resolve it…" rows={6} minLength={20} maxLength={2000} required /><small>{form.description.length}/2000 characters · minimum 20</small></label>
        <div className="submission-fields"><label>Category<select value={form.domain} onChange={(event) => update('domain', event.target.value)}>{domains.map((domain) => <option key={domain}>{domain}</option>)}</select></label></div>
        <LocationPicker value={locationData} onChange={setLocation} />
        <div className="submission-evidence"><div><p className="section-kicker">02 <strong>Add evidence <small>Optional</small></strong></p><p>Photos and documents help reviewers understand the issue.</p></div><label className="upload-zone"><input type="file" accept="image/jpeg,image/png,image/webp,application/pdf,.doc,.docx" multiple onChange={onFiles} /><span className="upload-icon">+</span><span><strong>Attach photos or documents</strong><small>Up to 5 files · 10 MB each</small></span></label></div>
        {fileNotice && <p className="submission-file-notice" role="status">{fileNotice}</p>}
        {attachments.length > 0 && <div className="attachment-list" aria-label="Selected files">{attachments.map((attachment) => <div className="attachment" key={attachment.id}>{attachment.previewUrl ? <img src={attachment.previewUrl} alt="" /> : <span className="file-icon">{attachment.type === 'application/pdf' ? 'PDF' : 'DOC'}</span>}<span><strong>{attachment.name}</strong><small>{formatFileSize(attachment.size)}</small></span><button type="button" onClick={() => removeFile(attachment.id)} aria-label={`Remove ${attachment.name}`}>×</button></div>)}</div>}
        {error && <p className="submission-error" role="alert">{error}</p>}{success && <p className="submission-success" role="status">✓ {success}</p>}
        {reviewing && <section className="submission-review" aria-live="polite"><div><p className="section-kicker">03 <strong>Ready to send?</strong></p><h3>Review your report</h3><p><strong>{form.title}</strong><br />{locationData?.address}<br />{attachments.length} attachment{attachments.length === 1 ? '' : 's'}</p></div><button type="button" className="review-edit" onClick={() => setReviewing(false)}>Keep editing</button></section>}
        <div className="submission-actions"><button type="button" className="draft-clear" onClick={discardDraft} disabled={!form.title && !form.description && !locationData}>Clear draft</button><button className="submit-button" type="submit" disabled={busy}>{busy ? 'Submitting report…' : reviewing ? 'Confirm and submit' : 'Review report'} <span>→</span></button></div>
        <p className="submission-assurance">Your report is only sent when you select “Confirm and submit.” It is never submitted automatically.</p>
      </form>
      <aside className={`analysis-panel analysis-${analysis.status}`}><div className="analysis-header"><span className="analysis-spark">✦</span><div><strong>Classification preview</strong><small>Guidance for review, not an automated decision</small></div><span className={`analysis-status analysis-status-${analysis.status}`}>{analysis.status}</span></div><p>{analysisMessage}</p>{analysis.status === 'completed' && <div className="analysis-result"><div><small>Category</small><strong>{analysis.category}</strong></div><div><small>Priority</small><strong className={`priority-${analysis.priority}`}>{analysis.priority}</strong></div></div>}<small className="analysis-note">You can submit even if this preview is unavailable.</small></aside>
    </div>
    <section className="recent-reports"><div className="feed-heading"><div><p className="eyebrow"><span /> Your recent reports</p><h2>Previously submitted.</h2></div><a href="#/tracker">Open full tracker →</a></div><div className="submission-feed">{submissions.length ? submissions.slice(0, 4).map((submission) => <article className="submission-card" key={submission.id}><div className="submission-card-top"><span className="feed-domain">{submission.domain}</span><time>{formatDate(submission.createdAt)}</time></div><h3>{submission.title}</h3><p>{submission.description}</p><div className="submission-card-bottom"><span className={`status-label status-${submission.status}`}>{submission.status.replace('_', ' ')}</span><button type="button" onClick={() => { setCommentFor(commentFor === submission.id ? null : submission.id); setCommentError('') }}>Add follow-up · {submission.comments}</button></div>{commentFor === submission.id && <div className="comment-box"><input value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Add a follow-up note" maxLength={1000} onKeyDown={(event) => { if (event.key === 'Enter') void submitComment(submission.id) }} /><button type="button" onClick={() => void submitComment(submission.id)}>Post</button>{commentError && <p role="alert">{commentError}</p>}</div>}</article>) : <p className="submission-empty">You have not submitted a report yet. Your submitted reports will appear here.</p>}</div></section>
  </section>
}
