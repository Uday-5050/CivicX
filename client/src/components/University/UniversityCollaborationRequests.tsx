import { useEffect, useState } from 'react'
import { decideUniversityOffer, listUniversityOffers } from '../../api/industry.api'
import type { OfferStatus, SupportOffer } from '../../api/types'
import './UniversityCollaborationRequests.css'

const labels: Record<SupportOffer['supportType'], string> = {
  mentorship: 'Mentorship', funding: 'Funding', prototyping: 'Prototyping', deployment: 'Deployment', technology_transfer: 'Technology transfer',
}

const formatDate = (value: string) => {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(date)
}

const formatMoney = (item: SupportOffer) => item.amountMinor === undefined ? '' : `${item.currency ?? 'Currency'} ${(item.amountMinor / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`

export default function UniversityCollaborationRequests() {
  const [offers, setOffers] = useState<SupportOffer[]>([])
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const load = async () => {
    setError('')
    try { setOffers(await listUniversityOffers()) } catch (loadError) { setError(loadError instanceof Error ? loadError.message : 'Unable to load collaboration offers.') }
  }
  useEffect(() => { void load() }, [])

  const decide = async (item: SupportOffer, status: Exclude<OfferStatus, 'pending' | 'withdrawn'>) => {
    setBusy(true); setNotice(''); setError('')
    try {
      const result = await decideUniversityOffer(item.id, status, item.version)
      setOffers((current) => current.map((offer) => offer.id === result.offer.id ? result.offer : offer))
      setNotice(status === 'accepted' ? 'Offer accepted. The industry partner now has authorized project access.' : 'Offer declined. No project access was granted.')
    } catch (decisionError) {
      setError(decisionError instanceof Error && decisionError.name === 'ConflictError' ? 'This offer was already decided. Refresh to see the latest status.' : decisionError instanceof Error ? decisionError.message : 'Unable to save this decision.')
    } finally { setBusy(false) }
  }

  return <section className="university-requests">
    <div className="university-requests-heading"><div><p className="eyebrow"><span /> Industry collaboration</p><h2>Support offers</h2><p>Review offers from industry partners for published university opportunities.</p></div><button type="button" onClick={() => void load()} disabled={busy}>↻ Refresh</button></div>
    {notice && <p className="university-request-notice" role="status">{notice}</p>}
    {error && <p className="university-request-error" role="alert">{error}</p>}
    {offers.length ? <div className="university-request-list">{offers.map((item) => <article key={item.id}>
      <div className="university-request-top"><div><strong>{item.organization}</strong><small>{labels[item.supportType]} · {item.projectTitle}</small></div><span className={`request-status request-${item.status}`}>{item.status}</span></div>
      <p className="offer-opportunity">Opportunity: {item.opportunityTitle}</p><p>{item.message}</p>
      <dl className="offer-details"><div><dt>Responsibilities</dt><dd>{item.responsibilities}</dd></div>{item.amountMinor !== undefined && <div><dt>Cash support</dt><dd>{formatMoney(item)}</dd></div>}{item.inKindDescription && <div><dt>In-kind support</dt><dd>{item.inKindDescription}</dd></div>}<div><dt>Submitted</dt><dd>{formatDate(item.createdAt)}</dd></div></dl>
      {item.status === 'pending' ? <div className="university-request-actions"><button type="button" disabled={busy} onClick={() => void decide(item, 'accepted')}>Accept and grant access</button><button type="button" disabled={busy} onClick={() => void decide(item, 'declined')}>Decline</button></div> : item.status === 'accepted' ? <button type="button" className="offer-project-link" onClick={() => { localStorage.setItem('civicx_project_id', item.projectId); window.location.hash = `#/projects/${encodeURIComponent(item.projectId)}` }}>Open authorized project →</button> : null}
    </article>)}</div> : <p className="university-requests-empty">No industry offers have reached your university yet.</p>}
  </section>
}
