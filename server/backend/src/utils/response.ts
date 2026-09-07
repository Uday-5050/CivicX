import { Response } from "express";

/**
 * Standard success response envelope.
 * Matches the SuccessResponse schema in docs/openapi.yaml.
 */
export function sendSuccess(
  res: Response,
  data: unknown,
  statusCode = 200
): void {
  const requestId = res.getHeader("X-Request-Id") as string | undefined;

  res.status(statusCode).json({
    success: true,
    data,
    meta: {
      requestId,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Standard error response envelope.
 * Matches the ErrorResponse schema in docs/openapi.yaml.
 */
export function sendError(
  res: Response,
  statusCode: number,
  code: string,
  message: string,
  details?: Array<{ field: string; message: string }>
): void {
  const requestId = res.getHeader("X-Request-Id") as string | undefined;

  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      ...(details && details.length > 0 ? { details } : {}),
    },
    meta: {
      requestId,
    },
  });
}
