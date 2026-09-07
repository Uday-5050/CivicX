import axios, { type AxiosInstance, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
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
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request interceptor: attach X-Request-Id
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (config.data instanceof FormData) {
      config.headers.delete('Content-Type');
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
  (error) => {
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

export async function request<T>(path: string, options: { method?: string; data?: unknown; params?: unknown } = {}): Promise<SuccessResponse<T>> {
  const response = await apiClient.request<SuccessResponse<T>>({
    url: path,
    method: options.method || 'GET',
    data: options.data,
    params: options.params,
  });
  return response.data;
}
