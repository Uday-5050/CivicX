import dotenv from "dotenv";

dotenv.config();

const config = {
  port: parseInt(process.env.PORT || "5000", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  mongoUri:
    process.env.MONGO_URI ||
    "mongodb://localhost:27017/civicx?replicaSet=rs0",
  logLevel: process.env.LOG_LEVEL || "info",

  // AI adapter
  aiProvider: process.env.AI_PROVIDER || "mock",

  // CORS
  corsOrigins: (process.env.CORS_ORIGINS || "http://localhost:5173")
    .split(",")
    .map((o) => o.trim()),

  // Derived
  isDev: (process.env.NODE_ENV || "development") === "development",
  isProd: process.env.NODE_ENV === "production",
} as const;

export default config;
