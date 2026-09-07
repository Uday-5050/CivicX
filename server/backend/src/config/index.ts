import dotenv from "dotenv";

dotenv.config();

function secret(name: string, fallback: string): string {
  const value = process.env[name];
  if (value) return value;
  if (process.env.NODE_ENV === "production") throw new Error(`${name} must be set in production`);
  return fallback;
}

const config = {
  port: parseInt(process.env.PORT || "5000", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  mongoUri:
    process.env.MONGO_URI ||
    "mongodb://localhost:27017/civicx",
  logLevel: process.env.LOG_LEVEL || "info",
  jwtAccessSecret: secret("JWT_ACCESS_SECRET", "development-only-access-secret-change-me"),
  jwtAccessTtl: process.env.JWT_ACCESS_TTL || "15m",
  refreshTokenTtlDays: parseInt(process.env.REFRESH_TOKEN_TTL_DAYS || "30", 10),
  passwordResetTtlMinutes: parseInt(process.env.PASSWORD_RESET_TTL_MINUTES || "30", 10),

  // AI adapter
  aiProvider: process.env.AI_PROVIDER || "mock",

  // CORS
  corsOrigins: (process.env.CORS_ORIGINS || "http://localhost:5173,http://127.0.0.1:5173")
    .split(",")
    .map((o) => o.trim()),

  // Derived
  isDev: (process.env.NODE_ENV || "development") === "development",
  isProd: process.env.NODE_ENV === "production",
} as const;

export default config;
