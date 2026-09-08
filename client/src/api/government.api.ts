import { request } from './client'
import type {
  GovActivityEvent,
  GovChallengeRow,
  GovDistrictStat,
  GovDomainStat,
  GovIndustryEngagement,
  GovKpiCard,
  GovProjectTimeline,
  GovTrendPoint,
  GovUniversityPerformance,
} from './types'

async function get<T>(path: string): Promise<T[]> {
  return (await request<T[]>(path)).data
}

export function listGovKpis() { return get<GovKpiCard>('/government/kpis') }
export function listGovDomainStats() { return get<GovDomainStat>('/government/domains') }
export function listGovDistrictStats() { return get<GovDistrictStat>('/government/districts') }
export function listGovUniversityPerformance() { return get<GovUniversityPerformance>('/government/universities') }
export function listGovIndustryEngagement() { return get<GovIndustryEngagement>('/government/industry') }
export function listGovProjectTimelines() { return get<GovProjectTimeline>('/government/projects') }
export function listGovTrends() { return get<GovTrendPoint>('/government/trends') }
export function listGovChallenges() { return get<GovChallengeRow>('/government/challenges') }
export function listGovActivity() { return get<GovActivityEvent>('/government/activity') }

export async function exportGovReport(reportType: 'summary' | 'detailed' | 'district'): Promise<{ url: string; filename: string }> {
  return (await request<{ url: string; filename: string }>('/government/reports/export', { method: 'POST', data: { reportType } })).data
}
