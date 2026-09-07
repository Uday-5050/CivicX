import { Request, Response } from "express";
import mongoose from "mongoose";
import config from "../../config";
import { sendSuccess } from "../../utils/response";

/**
 * GET /api/health
 * Returns backend health status.
 * Matches the HealthData schema in docs/openapi.yaml.
 */
export async function getHealth(_req: Request, res: Response): Promise<void> {
  const mongoState = mongoose.connection.readyState;
  const mongoStatus = mongoState === 1 ? "connected" : "disconnected";
  const isHealthy = mongoState === 1;

  const data = {
    status: isHealthy ? "healthy" : "degraded",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.nodeEnv,
    version: "1.0.0",
    mongo: mongoStatus,
  };

  const statusCode = isHealthy ? 200 : 503;
  sendSuccess(res, data, statusCode);
}
