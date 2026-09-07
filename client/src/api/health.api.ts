import { useQuery } from '@tanstack/react-query';
import { request } from './client';
import type { HealthData, SuccessResponse } from './types';
import { mockHealthSuccess } from './fixtures/health';

export async function fetchHealth(): Promise<SuccessResponse<HealthData>> {
  try {
    return await request<HealthData>('/health');
  } catch (err) {
    // If running in development and real API is unreachable, fall back to synthetic fixture
    if (import.meta.env.DEV) {
      console.warn('Backend API unreachable, using synthetic health fixture');
      return mockHealthSuccess;
    }
    throw err;
  }
}

export function useHealthQuery() {
  return useQuery({
    queryKey: ['health'],
    queryFn: fetchHealth,
    refetchInterval: 15000,
    retry: 1,
  });
}
