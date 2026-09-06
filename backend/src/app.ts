import express from "express";
import helmet from "helmet";
import { requestId } from "./middleware/requestId";
import { httpLogger } from "./middleware/logger";
import corsMiddleware from "./middleware/cors";
import { errorHandler } from "./middleware/errorHandler";
import { sendError } from "./utils/response";
import healthRoutes from "./modules/health/health.routes";

// ──────────────────────────────────────────────
// Express application (separated from server.ts)
// ──────────────────────────────────────────────
const app = express();

// ── Middleware chain (order matters) ──────────
app.use(requestId);        // 1. Attach request ID
app.use(httpLogger);       // 2. Structured request logging
app.use(helmet());         // 3. Security headers
app.use(corsMiddleware);   // 4. CORS allowlist
app.use(express.json({ limit: "1mb" }));  // 5. Parse JSON bodies
app.use(express.urlencoded({ extended: true }));

// ── Routes ────────────────────────────────────
app.use("/api/health", healthRoutes);

// ── 404 handler ───────────────────────────────
app.use((req, res) => {
  sendError(
    res,
    404,
    "NOT_FOUND",
    `Route ${req.method} ${req.originalUrl} not found`
  );
});

// ── Centralized error handler (must be last) ──
app.use(errorHandler);

export default app;
