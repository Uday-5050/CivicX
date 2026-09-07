import { useEffect, useState } from 'react'
import { decideCollaborationRequest, listCollaborationRequests } from '../../api/industry.api'
import type { CollaborationRequest, CollaborationType } from '../../api/types'
import './UniversityCollaborationRequests.css'

const labels: Record<CollaborationType, string> = { mentorship: 'Mentorship', funding: 'Funding', prototyping: 'Prototyping', deployment: 'Deployment', technology_transfer: 'Technology transfer' }

export default function UniversityCollaborationRequests() {
  const [requests, setRequests] = useState<CollaborationRequest[]>([])
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const load = async () => setRequests(await listCollaborationRequests())
  useEffect(() => { void load() }, [])
  const decide = async (item: CollaborationRequest, status: 'accepted' | 'declined') => {
    setBusy(true); setNotice('')
    try { const updated = await decideCollaborationRequest(item.id, status, item.version); setRequests((current) => current.map((request) => request.id === updated.id ? updated : request)); setNotice(status === 'accepted' ? 'Request accepted. Partner access was granted once.' : 'Request declined. Project milestone was not changed.') }
    catch (error) { setNotice(error instanceof Error && error.name === 'ConflictError' ? 'This request has already been decided.' : 'Unable to save this decision.') }
    finally { setBusy(false) }
  }
  return <section className="university-requests"><div className="university-requests-heading"><div><p className="eyebrow"><span /> Industry collaboration</p><h2>Partner requests</h2><p>Review access requests for projects owned by your university.</p></div><button type="button" onClick={() => void load()}>↻ Refresh</button></div>{notice && <p className="university-request-notice" role="status">{notice}</p>}{requests.length ? <div className="university-request-list">{requests.map((item) => <article key={item.id}><div className="university-request-top"><div><strong>{item.organization}</strong><small>{labels[item.collaborationType]} · {item.projectTitle}</small></div><span className={`request-status request-${item.status}`}>{item.status}</span></div><p>{item.message}</p>{item.status === 'pending' && <div className="university-request-actions"><button type="button" disabled={busy} onClick={() => void decide(item, 'accepted')}>Accept and grant access</button><button type="button" disabled={busy} onClick={() => void decide(item, 'declined')}>Decline</button></div>}</article>)}</div> : <p className="university-requests-empty">No industry requests yet.</p>}</section>
}
