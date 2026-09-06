import type { SuccessResponse, HealthData, ErrorResponse } from '../types';

export const mockHealthSuccess: SuccessResponse<HealthData> = {
  success: true,
  data: {
    status: 'healthy',
    timestamp: '2026-09-06T10:30:00.000Z',
    uptime: 3600,
    environment: 'development',
    version: '1.0.0',
    mongo: 'connected',
  },
  meta: {
    requestId: '550e8400-e29b-41d4-a716-446655440000',
    timestamp: '2026-09-06T10:30:00.000Z',
  },
};

export const mockHealthDegraded: SuccessResponse<HealthData> = {
  success: true,
  data: {
    status: 'degraded',
    timestamp: '2026-09-06T10:30:00.000Z',
    uptime: 7200,
    environment: 'development',
    version: '1.0.0',
    mongo: 'disconnected',
  },
  meta: {
    requestId: '660e8400-e29b-41d4-a716-446655440001',
    timestamp: '2026-09-06T10:30:00.000Z',
  },
};

export const mockValidationError: ErrorResponse = {
  success: false,
  error: {
    code: 'VALIDATION_ERROR',
    message: 'Request validation failed',
    details: [
      { field: 'title', message: 'Title is required' },
      { field: 'description', message: 'Description must be at least 10 characters' },
    ],
  },
  meta: {
    requestId: '550e8400-e29b-41d4-a716-446655440000',
  },
};
