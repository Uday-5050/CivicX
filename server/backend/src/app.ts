import express from "express";
import helmet from "helmet";
import { requestId } from "./middleware/requestId";
import { httpLogger } from "./middleware/logger";
import corsMiddleware from "./middleware/cors";
import { errorHandler } from "./middleware/errorHandler";
import { sendError } from "./utils/response";
import healthRoutes from "./modules/health/health.routes";
import authRoutes from "./modules/auth/auth.routes";
import universityRoutes from "./modules/university/university.routes";
import submissionRoutes from "./modules/submissions/submission.routes";
import adminRoutes from "./modules/admin/admin.routes";
import projectRoutes from "./modules/projects/project.routes";
import industryRoutes from "./modules/industry/industry.routes";

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
app.use("/api/auth", authRoutes);
app.use("/api/university", universityRoutes);
app.use("/api/submissions", submissionRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api", industryRoutes);

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
