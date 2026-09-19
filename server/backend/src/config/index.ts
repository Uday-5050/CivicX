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

  // Cloudinary media storage
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME || "",
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY || "",
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET || "",

  // AI adapter
  aiProvider: process.env.AI_PROVIDER || "mock",
  aiApiUrl: process.env.AI_API_URL || "",
  aiApiKey: process.env.AI_API_KEY || "",
  aiModel: process.env.AI_MODEL || "gemini-3.5-flash-lite",
  aiTimeoutMs: parseInt(process.env.AI_TIMEOUT_MS || "12000", 10),
  aiMaxInputChars: parseInt(process.env.AI_MAX_INPUT_CHARS || "6000", 10),
  aiWorkerEnabled: process.env.AI_WORKER_ENABLED !== "false",
  aiWorkerPollMs: parseInt(process.env.AI_WORKER_POLL_MS || "2000", 10),
  aiMaxAttempts: parseInt(process.env.AI_MAX_ATTEMPTS || "3", 10),
  aiLeaseMs: parseInt(process.env.AI_LEASE_MS || "30000", 10),
  voiceTranscriptionModel: process.env.VOICE_TRANSCRIPTION_MODEL || "gemini-3.5-transcribe",
  voiceMaxBytes: parseInt(process.env.VOICE_MAX_BYTES || String(15 * 1024 * 1024), 10),

  // CORS
  corsOrigins: [
    ...(process.env.CORS_ORIGINS || "http://localhost:5173,http://127.0.0.1:5173")
      .split(",")
      .map((o) => o.trim())
      .filter(Boolean),
    // Render supplies this hostname automatically. Allow the service to load
    // its own module scripts and styles without requiring a duplicated secret.
    ...(process.env.RENDER_EXTERNAL_HOSTNAME
      ? [`https://${process.env.RENDER_EXTERNAL_HOSTNAME}`]
      : []),
  ],

  // Derived
  isDev: (process.env.NODE_ENV || "development") === "development",
  isProd: process.env.NODE_ENV === "production",
} as const;

export default config;
