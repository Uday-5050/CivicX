import mongoose from "mongoose";
import app from "./app";
import config from "./config";
import { logger } from "./middleware/logger";

// ──────────────────────────────────────────────
// Server startup (separated from app.ts)
// ──────────────────────────────────────────────

async function start(): Promise<void> {
  // ── Connect to MongoDB ────────────────────
  try {
    await mongoose.connect(config.mongoUri);
    logger.info({ uri: config.mongoUri.replace(/\/\/.*@/, "//<credentials>@") }, "MongoDB connected");
  } catch (err) {
    logger.warn({ err }, "MongoDB connection failed — running without database");
    // Server still starts; health will report "degraded"
  }

  // ── Mongoose event listeners ──────────────
  mongoose.connection.on("error", (err) => {
    logger.error({ err }, "MongoDB connection error");
  });

  mongoose.connection.on("disconnected", () => {
    logger.warn("MongoDB disconnected");
  });

  // ── Start HTTP server ─────────────────────
  const server = app.listen(config.port, () => {
    logger.info(
      {
        port: config.port,
        env: config.nodeEnv,
        health: `http://localhost:${config.port}/api/health`,
      },
      `CivicX API server started`
    );
  });

  // ── Graceful shutdown ─────────────────────
  const shutdown = async (signal: string) => {
    logger.info({ signal }, "Shutdown signal received");
    server.close(async () => {
      await mongoose.connection.close();
      logger.info("Server shut down gracefully");
      process.exit(0);
    });
    // Force shutdown after 10s
    setTimeout(() => {
      logger.error("Forced shutdown after timeout");
      process.exit(1);
    }, 10_000);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

start().catch((err) => {
  logger.fatal({ err }, "Failed to start server");
  process.exit(1);
});
