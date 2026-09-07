import type { NextFunction, Request, Response } from "express";
import { ForbiddenError, UnauthorizedError } from "../../utils/errors";
import type { Role } from "./auth.types";
import { verifyAccessToken } from "./auth.service";
import { User } from "./user.model";
export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> { try { const header = req.headers.authorization; if (!header?.startsWith("Bearer ")) throw UnauthorizedError(); const claims = await verifyAccessToken(header.slice(7)); const user = await User.findById(claims.userId); if (!user || user.accountStatus !== "active") throw UnauthorizedError("Your session is no longer active"); req.auth = { userId: user._id.toString(), role: user.role }; next(); } catch (error) { next(error instanceof Error && "statusCode" in error ? error : UnauthorizedError("Invalid or expired access token")); } }
export const requireRole = (...roles: Role[]) => (req: Request, _res: Response, next: NextFunction): void => { if (!req.auth) return next(UnauthorizedError()); if (!roles.includes(req.auth.role)) return next(ForbiddenError()); next(); };
