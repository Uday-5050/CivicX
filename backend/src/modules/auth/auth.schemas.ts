import { z } from "zod";
const email = z.string().trim().email().max(254).transform((value) => value.toLowerCase());
const password = z.string().min(8, "Password must be at least 8 characters").max(128);
export const registerSchema = z.object({ name: z.string().trim().min(2).max(120), email, password });
export const onboardingSchema = z.object({ name: z.string().trim().min(2).max(120), email, password, institutionName: z.string().trim().min(2).max(200), institutionType: z.enum(["university", "industry"]) });
export const loginSchema = z.object({ email, password: z.string().min(1).max(128) });
export const refreshSchema = z.object({ refreshToken: z.string().min(32).max(512) });
export const forgotPasswordSchema = z.object({ email });
export const resetPasswordSchema = z.object({ token: z.string().min(32).max(512), password });
