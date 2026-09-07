import argon2 from "argon2";
import { createHash, randomBytes } from "crypto";
import { SignJWT, jwtVerify } from "jose";
import { Types } from "mongoose";
import config from "../../config";
import type { ClientType, Role } from "./auth.types";
import { RefreshSession } from "./refresh-session.model";
import { User, type UserDocument } from "./user.model";

const accessSecret = new TextEncoder().encode(config.jwtAccessSecret);
export const normalizeEmail = (email: string): string => email.trim().toLowerCase();
export const tokenHash = (token: string): string => createHash("sha256").update(token).digest("hex");
export const newOpaqueToken = (): string => randomBytes(48).toString("base64url");
export const hashPassword = (password: string): Promise<string> => argon2.hash(password, { type: argon2.argon2id });
export const verifyPassword = (hash: string, password: string): Promise<boolean> => argon2.verify(hash, password);
export async function signAccessToken(user: Pick<UserDocument, "_id" | "role">): Promise<string> { return new SignJWT({ role: user.role }).setProtectedHeader({ alg: "HS256" }).setSubject(user._id.toString()).setIssuedAt().setExpirationTime(config.jwtAccessTtl).sign(accessSecret); }
export async function verifyAccessToken(token: string): Promise<{ userId: string; role: Role }> { const { payload } = await jwtVerify(token, accessSecret, { algorithms: ["HS256"] }); if (typeof payload.sub !== "string" || !["citizen", "university", "industry", "admin"].includes(String(payload.role))) throw new Error("Invalid access token"); return { userId: payload.sub, role: payload.role as Role }; }
export async function createRefreshSession(userId: Types.ObjectId, client: ClientType): Promise<{ token: string; expiresAt: Date }> { const token = newOpaqueToken(); const expiresAt = new Date(Date.now() + config.refreshTokenTtlDays * 86400000); await RefreshSession.create({ userId, client, tokenHash: tokenHash(token), expiresAt }); return { token, expiresAt }; }
export async function rotateRefreshSession(token: string, client: ClientType): Promise<{ user: UserDocument; refreshToken: string; expiresAt: Date }> { const session = await RefreshSession.findOne({ tokenHash: tokenHash(token) }).select("+tokenHash"); if (!session || session.client !== client || session.revokedAt || session.expiresAt <= new Date()) throw new Error("Invalid refresh token"); const user = await User.findById(session.userId); if (!user || user.accountStatus !== "active") throw new Error("Inactive account"); session.revokedAt = new Date(); await session.save(); const replacement = await createRefreshSession(user._id, client); return { user, refreshToken: replacement.token, expiresAt: replacement.expiresAt }; }
export async function revokeRefreshSession(token: string): Promise<void> { await RefreshSession.updateOne({ tokenHash: tokenHash(token), revokedAt: { $exists: false } }, { $set: { revokedAt: new Date() } }); }
export async function revokeAllRefreshSessions(userId: Types.ObjectId): Promise<void> { await RefreshSession.updateMany({ userId, revokedAt: { $exists: false } }, { $set: { revokedAt: new Date() } }); }
export function publicUser(user: UserDocument): Record<string, unknown> { return { id: user._id.toString(), name: user.name, email: user.email, role: user.role, accountStatus: user.accountStatus, institutionId: user.institutionId?.toString() ?? null }; }
