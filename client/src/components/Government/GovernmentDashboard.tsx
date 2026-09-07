import { useEffect, useState } from 'react'
import {
  listGovKpis,
  listGovDomainStats,
  listGovDistrictStats,
  listGovUniversityPerformance,
  listGovIndustryEngagement,
  listGovProjectTimelines,
  listGovTrends,
  listGovChallenges,
  listGovActivity,
  exportGovReport,
} from '../../api/government.api'
import type {
  GovKpiCard,
  GovDomainStat,
  GovDistrictStat,
  GovUniversityPerformance,
  GovIndustryEngagement,
  GovProjectTimeline,
  GovProjectStage,
  GovTrendPoint,
  GovChallengeRow,
  GovActivityEvent,
} from '../../api/types'
import './GovernmentDashboard.css'

const formatDate = (v: string) =>
  new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(v))

const formatTime = (v: string) =>
  new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(v))

const today = new Intl.DateTimeFormat('en-IN', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
}).format(new Date())

const STAGE_LABELS: Record<GovProjectStage, string> = {
  submitted: 'Submitted',
  under_review: 'Under Review',
  in_progress: 'In Progress',
  pilot: 'Pilot',
  deployed: 'Deployed',
}

const ACTIVITY_ICONS: Record<string, string> = {
  challenge: '📋',
  project: '🔬',
  collaboration: '🤝',
  milestone: '🏁',
}

type DashboardTab = 'overview' | 'institutions' | 'projects' | 'challenges'

export default function GovernmentDashboard() {
  const [tab, setTab] = useState<DashboardTab>('overview')
  const [kpis, setKpis] = useState<GovKpiCard[]>([])
  const [domains, setDomains] = useState<GovDomainStat[]>([])
  const [districts, setDistricts] = useState<GovDistrictStat[]>([])
  const [universities, setUniversities] = useState<GovUniversityPerformance[]>([])
  const [industries, setIndustries] = useState<GovIndustryEngagement[]>([])
  const [projects, setProjects] = useState<GovProjectTimeline[]>([])
  const [trends, setTrends] = useState<GovTrendPoint[]>([])
  const [challenges, setChallenges] = useState<GovChallengeRow[]>([])
  const [activity, setActivity] = useState<GovActivityEvent[]>([])
  const [notice, setNotice] = useState('')
  const [exporting, setExporting] = useState(false)

  /* ── Filters ── */
  const [stageFilter, setStageFilter] = useState<GovProjectStage | 'all'>('all')
  const [domainFilter, setDomainFilter] = useState('All')
  const [districtFilter, setDistrictFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [challengePage, setChallengePage] = useState(1)
  const challengePageSize = 5

  const load = async () => {
    try {
      const [k, dom, dist, uni, ind, proj, tr, ch, act] = await Promise.all([
        listGovKpis(),
        listGovDomainStats(),
        listGovDistrictStats(),
        listGovUniversityPerformance(),
        listGovIndustryEngagement(),
        listGovProjectTimelines(),
        listGovTrends(),
        listGovChallenges(),
        listGovActivity(),
      ])
      setKpis(k); setDomains(dom); setDistricts(dist); setUniversities(uni)
      setIndustries(ind); setProjects(proj); setTrends(tr); setChallenges(ch); setActivity(act)
      setNotice('')
    } catch {
      setNotice('Unable to load government dashboard data.')
    }
  }

  useEffect(() => { void load() }, [])

  const handleExport = async (type: 'summary' | 'detailed' | 'district') => {
    setExporting(true)
    setNotice('')
    try {
      const result = await exportGovReport(type)
      setNotice(`Report generated: ${result.filename}`)
    } catch {
      setNotice('Export failed. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  /* ── Derived data ── */
  const domainMax = Math.max(...domains.map((d) => d.submitted + d.inProgress + d.resolved), 1)

  const filteredProjects = stageFilter === 'all' ? projects : projects.filter((p) => p.stage === stageFilter)
  const stages: (GovProjectStage | 'all')[] = ['all', 'submitted', 'under_review', 'in_progress', 'pilot', 'deployed']
  const stageCountMap = projects.reduce<Record<string, number>>((acc, p) => { acc[p.stage] = (acc[p.stage] || 0) + 1; return acc }, {})

  const challengeDomains = ['All', ...new Set(challenges.map((c) => c.domain))]
  const challengeDistricts = ['All', ...new Set(challenges.map((c) => c.district))]
  const challengeStatuses = ['All', ...new Set(challenges.map((c) => c.status))]
  const filteredChallenges = challenges.filter(
    (c) => (domainFilter === 'All' || c.domain === domainFilter) &&
      (districtFilter === 'All' || c.district === districtFilter) &&
      (statusFilter === 'All' || c.status === statusFilter)
  )
  const challengePages = Math.max(1, Math.ceil(filteredChallenges.length / challengePageSize))
  const visibleChallenges = filteredChallenges.slice((challengePage - 1) * challengePageSize, challengePage * challengePageSize)

  const trendMax = Math.max(...trends.map((t) => Math.max(t.submitted, t.resolved)), 1)

  return (
    <section className="gov-dashboard">
      {/* ── Header ── */}
      <div className="gov-header">
        <div className="gov-header-top">
          <div className="gov-header-info">
            <span className="gov-badge"><span className="gov-badge-dot" /> Government Dashboard</span>
            <h1>Jharkhand Innovation <em>Command Centre</em></h1>
            <p>Monitor societal challenges, track university and industry engagement, and measure innovation impact across all 24 districts of Jharkhand.</p>
          </div>
          <div className="gov-header-actions">
            <button type="button" onClick={() => void load()}>↻ Refresh</button>
            <button type="button" className="gov-export-btn" disabled={exporting} onClick={() => void handleExport('summary')}>
              {exporting ? 'Generating…' : '📊 Export Report'}
            </button>
          </div>
        </div>
        <p className="gov-date-display">{today}</p>
      </div>

      {notice && <p className="gov-notice" role="status">{notice}</p>}

      {/* ── KPI Cards ── */}
      <div className="gov-kpis">
        {kpis.map((kpi) => (
          <article className="gov-kpi-card" key={kpi.id}>
            <span className="gov-kpi-icon">{kpi.icon}</span>
            <strong className="gov-kpi-value">{kpi.value.toLocaleString('en-IN')}</strong>
            <span className="gov-kpi-label">{kpi.label}</span>
            <span className={`gov-kpi-change ${kpi.change > 0 ? 'positive' : 'neutral'}`}>
              {kpi.change > 0 ? `↑ ${kpi.change}%` : '—'}
            </span>
          </article>
        ))}
      </div>

      {/* ── Tabs ── */}
      <div className="gov-tabs">
        <button type="button" className={`gov-tab ${tab === 'overview' ? 'active' : ''}`} onClick={() => setTab('overview')}>Overview</button>
        <button type="button" className={`gov-tab ${tab === 'institutions' ? 'active' : ''}`} onClick={() => setTab('institutions')}>Institutions</button>
        <button type="button" className={`gov-tab ${tab === 'projects' ? 'active' : ''}`} onClick={() => setTab('projects')}>Projects</button>
        <button type="button" className={`gov-tab ${tab === 'challenges' ? 'active' : ''}`} onClick={() => setTab('challenges')}>Challenges</button>
      </div>

      {/* ══════════════════════════════════════════════ */}
      {/*  OVERVIEW TAB                                 */}
      {/* ══════════════════════════════════════════════ */}
      {tab === 'overview' && (
        <>
          <div className="gov-two-col">
            {/* Domain Analytics */}
            <section className="gov-section">
              <div className="gov-section-head">
                <div>
                  <span className="gov-section-kicker">01 <strong>Domain Analytics</strong></span>
                  <h2>Challenges by thematic domain</h2>
                </div>
              </div>
              <div className="gov-domain-bars">
                {domains.map((d) => {
                  const total = d.submitted + d.inProgress + d.resolved
                  return (
                    <div className="gov-domain-row" key={d.id}>
                      <span className="gov-domain-name">{d.domain}</span>
                      <div className="gov-domain-track">
                        <div className="gov-domain-bar" style={{ width: `${(d.resolved / domainMax) * 100}%`, background: d.color, opacity: .45 }} />
                        <div className="gov-domain-bar" style={{ width: `${(d.inProgress / domainMax) * 100}%`, background: d.color, opacity: .7 }} />
                        <div className="gov-domain-bar" style={{ width: `${(d.submitted / domainMax) * 100}%`, background: d.color }} />
                      </div>
                      <span className="gov-domain-count">{total}</span>
                    </div>
                  )
                })}
              </div>
              <div className="gov-domain-legend">
                <span><span className="gov-legend-dot" style={{ background: '#0b3d91', opacity: .45 }} /> Resolved</span>
                <span><span className="gov-legend-dot" style={{ background: '#0b3d91', opacity: .7 }} /> In Progress</span>
                <span><span className="gov-legend-dot" style={{ background: '#0b3d91' }} /> Submitted</span>
              </div>
            </section>

            {/* Trends */}
            <section className="gov-section">
              <div className="gov-section-head">
                <div>
                  <span className="gov-section-kicker">02 <strong>Monthly Trends</strong></span>
                  <h2>Submissions vs. resolutions</h2>
                </div>
              </div>
              <div className="gov-trend-chart">
                {trends.map((t) => (
                  <div className="gov-trend-col" key={t.month}>
                    <div className="gov-trend-bars">
                      <div className="gov-trend-bar submitted" style={{ height: `${(t.submitted / trendMax) * 140}px` }} />
                      <div className="gov-trend-bar resolved" style={{ height: `${(t.resolved / trendMax) * 140}px` }} />
                    </div>
                    <span className="gov-trend-label">{t.month}</span>
                  </div>
                ))}
              </div>
              <div className="gov-trend-legend">
                <span><span className="gov-legend-dot" style={{ background: '#3b82f6' }} /> Submitted</span>
                <span><span className="gov-legend-dot" style={{ background: '#22c55e' }} /> Resolved</span>
              </div>
            </section>
          </div>

          {/* District Table */}
          <section className="gov-section">
            <div className="gov-section-head">
              <div>
                <span className="gov-section-kicker">03 <strong>District Performance</strong></span>
                <h2>District-wise challenge overview</h2>
              </div>
            </div>
            <table className="gov-district-table">
              <thead>
                <tr>
                  <th>District</th>
                  <th>Total Challenges</th>
                  <th>Active Projects</th>
                  <th>Resolved</th>
                  <th>Resolution Rate</th>
                  <th>Universities</th>
                  <th>Industry Partners</th>
                </tr>
              </thead>
              <tbody>
                {districts.map((d) => {
                  const rate = d.totalChallenges ? Math.round((d.resolved / d.totalChallenges) * 100) : 0
                  return (
                    <tr key={d.id}>
                      <td><span className="gov-district-name">{d.district}</span></td>
                      <td>{d.totalChallenges}</td>
                      <td>{d.activeProjects}</td>
                      <td>{d.resolved}</td>
                      <td>
                        <div className="gov-progress-cell">
                          <div className="gov-progress-mini"><span style={{ width: `${rate}%` }} /></div>
                          <span>{rate}%</span>
                        </div>
                      </td>
                      <td>{d.universitiesEngaged}</td>
                      <td>{d.industryPartners}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </section>

          {/* Activity Feed */}
          <section className="gov-section">
            <div className="gov-section-head">
              <div>
                <span className="gov-section-kicker">04 <strong>Activity Feed</strong></span>
                <h2>Recent platform activity</h2>
              </div>
            </div>
            <div className="gov-activity-list">
              {activity.map((a) => (
                <div className="gov-activity-item" key={a.id}>
                  <span className={`gov-activity-icon type-${a.type}`}>{ACTIVITY_ICONS[a.type]}</span>
                  <span className="gov-activity-text">{a.message}</span>
                  <span className="gov-activity-time">{formatTime(a.timestamp)}</span>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      {/* ══════════════════════════════════════════════ */}
      {/*  INSTITUTIONS TAB                             */}
      {/* ══════════════════════════════════════════════ */}
      {tab === 'institutions' && (
        <>
          {/* University Performance */}
          <section className="gov-section">
            <div className="gov-section-head">
              <div>
                <span className="gov-section-kicker">01 <strong>University Performance</strong></span>
                <h2>Higher Education Institution engagement</h2>
              </div>
            </div>
            <table className="gov-uni-table">
              <thead>
                <tr>
                  <th>Institution</th>
                  <th>Assigned</th>
                  <th>Active</th>
                  <th>Proposals</th>
                  <th>Deployed</th>
                  <th>Patents</th>
                  <th>Startups</th>
                </tr>
              </thead>
              <tbody>
                {universities.map((u) => (
                  <tr key={u.id}>
                    <td><span className="gov-uni-name">{u.name}</span></td>
                    <td>{u.challengesAssigned}</td>
                    <td>{u.projectsActive}</td>
                    <td>{u.proposalsSubmitted}</td>
                    <td><span className="gov-uni-highlight">{u.solutionsDeployed}</span></td>
                    <td>{u.patents}</td>
                    <td>{u.startupsIncubated}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* Industry Engagement */}
          <section className="gov-section">
            <div className="gov-section-head">
              <div>
                <span className="gov-section-kicker">02 <strong>Industry Collaboration</strong></span>
                <h2>Partner engagement overview</h2>
              </div>
            </div>
            <div className="gov-industry-grid">
              {industries.map((ind) => (
                <article className={`gov-industry-card type-${ind.type}`} key={ind.id}>
                  <div>
                    <span className="gov-industry-name">{ind.name}</span>
                    <span className="gov-industry-type">{ind.type}</span>
                    <span className="gov-industry-sector">{ind.sector}</span>
                  </div>
                  <div className="gov-industry-stats">
                    <div className="gov-industry-stat">
                      <small>Funding</small>
                      <strong>₹{ind.fundingLakhs}L</strong>
                    </div>
                    <div className="gov-industry-stat">
                      <small>Mentorship</small>
                      <strong>{ind.mentorshipHours}h</strong>
                    </div>
                    <div className="gov-industry-stat">
                      <small>Prototypes</small>
                      <strong>{ind.prototypes}</strong>
                    </div>
                    <div className="gov-industry-stat">
                      <small>Deployments</small>
                      <strong>{ind.deployments}</strong>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </>
      )}

      {/* ══════════════════════════════════════════════ */}
      {/*  PROJECTS TAB                                 */}
      {/* ══════════════════════════════════════════════ */}
      {tab === 'projects' && (
        <section className="gov-section">
          <div className="gov-section-head">
            <div>
              <span className="gov-section-kicker">01 <strong>Project Lifecycle</strong></span>
              <h2>Active innovation projects</h2>
            </div>
          </div>
          <div className="gov-project-stages">
            {stages.map((s) => (
              <button
                type="button"
                key={s}
                className={`gov-stage-tab ${stageFilter === s ? 'active' : ''}`}
                onClick={() => setStageFilter(s)}
              >
                {s === 'all' ? 'All' : STAGE_LABELS[s]}
                <span className="gov-stage-count">{s === 'all' ? projects.length : (stageCountMap[s] || 0)}</span>
              </button>
            ))}
          </div>
          <div className="gov-project-list">
            {filteredProjects.map((p) => (
              <article className="gov-project-card" key={p.id}>
                <div>
                  <div className="gov-project-title">{p.title}</div>
                  <div className="gov-project-meta">
                    <span>🏛 {p.university}</span>
                    <span>🏭 {p.industry}</span>
                    <span>📍 {p.district}</span>
                    <span>📂 {p.domain}</span>
                    <span>📅 {formatDate(p.lastUpdated)}</span>
                  </div>
                </div>
                <span className={`gov-project-stage-pill stage-${p.stage}`}>
                  {STAGE_LABELS[p.stage]}
                </span>
              </article>
            ))}
            {filteredProjects.length === 0 && (
              <p style={{ textAlign: 'center', color: '#94a3b8', padding: '24px 0', fontSize: '13px' }}>No projects in this stage.</p>
            )}
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════════ */}
      {/*  CHALLENGES TAB                               */}
      {/* ══════════════════════════════════════════════ */}
      {tab === 'challenges' && (
        <section className="gov-section">
          <div className="gov-section-head">
            <div>
              <span className="gov-section-kicker">01 <strong>Challenge Registry</strong></span>
              <h2>All submitted societal challenges</h2>
            </div>
            <div className="gov-filters">
              <select value={domainFilter} onChange={(e) => { setDomainFilter(e.target.value); setChallengePage(1) }} aria-label="Filter by domain">
                {challengeDomains.map((d) => <option key={d}>{d}</option>)}
              </select>
              <select value={districtFilter} onChange={(e) => { setDistrictFilter(e.target.value); setChallengePage(1) }} aria-label="Filter by district">
                {challengeDistricts.map((d) => <option key={d}>{d}</option>)}
              </select>
              <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setChallengePage(1) }} aria-label="Filter by status">
                {challengeStatuses.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="gov-challenge-list">
            {visibleChallenges.map((c) => (
              <div className="gov-challenge-row" key={c.id}>
                <div>
                  <span className="gov-challenge-title">{c.title}</span>
                  <span className="gov-challenge-subtitle">🏛 {c.university} · 📅 {formatDate(c.submittedAt)}</span>
                </div>
                <span className="gov-challenge-domain">{c.domain}</span>
                <span className="gov-challenge-district">{c.district}</span>
                <span className={`gov-priority-pill priority-${c.priority}`}>{c.priority}</span>
                <span className={`gov-status-pill status-${c.status}`}>{c.status.replace('_', ' ')}</span>
              </div>
            ))}
            {visibleChallenges.length === 0 && (
              <p style={{ textAlign: 'center', color: '#94a3b8', padding: '24px 0', fontSize: '13px' }}>No challenges match the current filters.</p>
            )}
          </div>
          <div className="gov-pagination">
            <span>Page {challengePage} of {challengePages} · {filteredChallenges.length} results</span>
            <button type="button" disabled={challengePage === 1} onClick={() => setChallengePage((p) => p - 1)}>← Prev</button>
            <button type="button" disabled={challengePage === challengePages} onClick={() => setChallengePage((p) => p + 1)}>Next →</button>
          </div>
        </section>
      )}
    </section>
  )
}
