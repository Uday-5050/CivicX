import { Request, Response, NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";

/**
 * Attach a unique request ID to every incoming request.
 * Clients may supply their own via X-Request-Id header;
 * otherwise a UUID v4 is generated.
 */
export function requestId(req: Request, res: Response, next: NextFunction): void {
  const id = (req.headers["x-request-id"] as string) || uuidv4();
  req.id = id;
  res.setHeader("X-Request-Id", id);
  next();
}

