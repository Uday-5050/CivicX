import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/errors";
import { sendError } from "../utils/response";
import { logger } from "./logger";
import config from "../config";


export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  logger.error(
    {
      err,
      requestId: req.id,
      method: req.method,
      url: req.originalUrl,
    },
    err.message
  );

  if (err instanceof AppError) {
    sendError(res, err.statusCode, err.code, err.message, err.details);
    return;
  }

  // CORS errors
  if (err.message.includes("not allowed by CORS")) {
    sendError(res, 403, "CORS_ERROR", err.message);
    return;
  }

  // JSON parse errors
  if (err.type === "entity.parse.failed") {
    sendError(res, 400, "PARSE_ERROR", "Invalid JSON in request body");
    return;
  }

  // Unknown errors — never leak internals in production
  const message = config.isDev ? err.message : "An unexpected error occurred";
  sendError(res, 500, "INTERNAL_ERROR", message);
}
