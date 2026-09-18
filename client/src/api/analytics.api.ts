import { apiClient, request } from './client'
import type { AnalyticsReport } from './types'

export interface AnalyticsFilters {
  domain?: string;
  district?: string;
  institutionId?: string;
  from?: string;
  to?: string;
}

export async function getAdminAnalytics(filters: AnalyticsFilters = {}): Promise<AnalyticsReport> {
  return (await request<AnalyticsReport>('/admin/analytics', { params: filters })).data
}

export async function exportAdminAnalyticsCsv(filters: AnalyticsFilters = {}): Promise<{ filename?: string; content: string }> {
  const response = await apiClient.get<string>('/admin/analytics/export.csv', { params: filters, responseType: 'text' })
  const disposition = response.headers['content-disposition'] as string | undefined
  const filename = disposition?.match(/filename="?([^";]+)"?/i)?.[1]
  return { filename, content: response.data }
}
