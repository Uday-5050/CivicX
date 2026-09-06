import type { Role } from '../constants/roles';
import type { IssueStatus, IssuePriority, IssueCategory } from '../constants/status';

export type { Role, IssueStatus, IssuePriority, IssueCategory };

export interface ResponseMeta {
  requestId?: string;
  timestamp?: string;
}

export interface SuccessResponse<T> {
  success: true;
  data: T;
  meta?: ResponseMeta;
}

export interface ErrorDetail {
  field?: string;
  message: string;
}

export interface ErrorPayload {
  code: string;
  message: string;
  details?: ErrorDetail[];
}

export interface ErrorResponse {
  success: false;
  error: ErrorPayload;
  meta?: ResponseMeta;
}

export type ApiResponse<T> = SuccessResponse<T> | ErrorResponse;

export interface HealthData {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  environment: 'development' | 'staging' | 'production';
  version?: string;
  mongo?: 'connected' | 'disconnected';
}

export class ApiError extends Error {
  code: string;
  details?: ErrorDetail[];
  statusCode?: number;
  requestId?: string;

  constructor(payload: ErrorPayload, statusCode?: number, requestId?: string) {
    super(payload.message);
    this.name = 'ApiError';
    this.code = payload.code;
    this.details = payload.details;
    this.statusCode = statusCode;
    this.requestId = requestId;
  }
}
