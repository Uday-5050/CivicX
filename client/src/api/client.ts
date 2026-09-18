import axios, { type AxiosError, type AxiosInstance, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { ApiError, type ErrorResponse, type SuccessResponse } from './types';

function generateRequestId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export const apiClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

const refreshClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

type RetriableRequestConfig = InternalAxiosRequestConfig & { civicxRetried?: boolean };
let refreshPromise: Promise<string> | null = null;

function isAuthEndpoint(url?: string): boolean {
  return Boolean(url && /\/auth\/(web\/refresh|web\/login|register|onboard-request|forgot-password|reset-password)/.test(url));
}

async function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = refreshClient.post<SuccessResponse<{ accessToken: string }>>('/auth/web/refresh')
      .then((response) => {
        const token = response.data.data.accessToken;
        sessionStorage.setItem('civicx_access_token', token);
        return token;
      })
      .finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

// Request interceptor: attach X-Request-Id
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (config.data instanceof FormData) {
      config.headers.delete('Content-Type');
      // Evidence uploads can legitimately take longer than ordinary JSON API
      // calls because the backend streams them to private cloud storage first.
      config.timeout = 120000;
    }
    if (!config.headers.get('X-Request-Id')) {
      config.headers.set('X-Request-Id', generateRequestId());
    }
    const accessToken = sessionStorage.getItem('civicx_access_token');
    if (accessToken && !config.headers.get('Authorization')) {
      config.headers.set('Authorization', `Bearer ${accessToken}`);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: envelope validation
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    const data = response.data as SuccessResponse<unknown> | ErrorResponse;
    if (data && data.success === false) {
      throw new ApiError(
        data.error,
        response.status,
        data.meta?.requestId || (response.headers['x-request-id'] as string)
      );
    }
    return response;
  },
  async (error: AxiosError<ErrorResponse>) => {
    const original = error.config as RetriableRequestConfig | undefined;
    if (error.response?.status === 401 && original && !original.civicxRetried && !isAuthEndpoint(original.url)) {
      original.civicxRetried = true;
      try {
        await refreshAccessToken();
        return apiClient.request(original);
      } catch {
        sessionStorage.removeItem('civicx_access_token');
        if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('civicx:session-expired'));
      }
    }
    if (error.response?.data) {
      const errData = error.response.data as ErrorResponse;
      if (errData && errData.error) {
        throw new ApiError(
          errData.error,
          error.response.status,
          errData.meta?.requestId || (error.response.headers['x-request-id'] as string)
        );
      }
    }
    throw new ApiError(
      {
        code: 'NETWORK_ERROR',
        message: error.message || 'Network request failed',
      },
      error.response?.status,
      error.config?.headers?.['X-Request-Id'] as string
    );
  }
);

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function apiErrorKind(error: unknown): 'unauthorized' | 'forbidden' | 'conflict' | 'validation' | 'network' | 'unknown' {
  if (!(error instanceof ApiError)) return 'unknown';
  if (error.statusCode === 401) return 'unauthorized';
  if (error.statusCode === 403) return 'forbidden';
  if (error.statusCode === 409) return 'conflict';
  if (error.statusCode === 400 || error.statusCode === 422) return 'validation';
  if (error.code === 'NETWORK_ERROR') return 'network';
  return 'unknown';
}

export async function request<T>(path: string, options: { method?: string; data?: unknown; params?: unknown } = {}): Promise<SuccessResponse<T>> {
  const response = await apiClient.request<SuccessResponse<T>>({
    url: path,
    method: options.method || 'GET',
    data: options.data,
    params: options.params,
  });
  return response.data;
}
