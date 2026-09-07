/**
 * Custom application error class.
 * Carries an HTTP status code and a machine-readable error code
 * so the centralized error handler can produce consistent responses.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: Array<{ field: string; message: string }>;

  constructor(
    statusCode: number,
    code: string,
    message: string,
    details?: Array<{ field: string; message: string }>
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

// ── Convenience factories ─────────────────────────────────────

export const NotFoundError = (message = "The requested resource was not found") =>
  new AppError(404, "NOT_FOUND", message);

export const ValidationError = (
  message: string,
  details?: Array<{ field: string; message: string }>
) => new AppError(400, "VALIDATION_ERROR", message, details);

export const UnauthorizedError = (message = "Authentication is required") =>
  new AppError(401, "UNAUTHORIZED", message);

export const ForbiddenError = (
  message = "You do not have permission to perform this action"
) => new AppError(403, "FORBIDDEN", message);

export const ConflictError = (message: string) =>
  new AppError(409, "CONFLICT", message);

export const InternalError = (message = "An unexpected error occurred") =>
  new AppError(500, "INTERNAL_ERROR", message);
