import express from "express";
import { existsSync } from "node:fs";
import path from "node:path";
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
import institutionRoutes, { institutionAdminRouter } from "./modules/institutions/institution.routes";
import publicSubmissionRoutes from "./modules/submissions/public-submission.routes";
import notificationRoutes from "./modules/notifications/notification.routes";
import analyticsRoutes from "./modules/admin/analytics.routes";

// ──────────────────────────────────────────────
// Express application (separated from server.ts)
// ──────────────────────────────────────────────
import governmentRoutes from "./modules/government/government.routes";

const app = express();

const contentSecurityDirectives = helmet.contentSecurityPolicy.getDefaultDirectives();
contentSecurityDirectives["connect-src"] = ["'self'", "https://nominatim.openstreetmap.org"];
contentSecurityDirectives["img-src"] = ["'self'", "data:", "blob:", "https://*.tile.openstreetmap.org"];

// ── Middleware chain (order matters) ──────────
app.use(requestId);        // 1. Attach request ID
app.use(httpLogger);       // 2. Structured request logging
app.use(helmet({ contentSecurityPolicy: { directives: contentSecurityDirectives } })); // 3. Security headers
app.use(corsMiddleware);   // 4. CORS allowlist
app.use(express.json({ limit: "1mb" }));  // 5. Parse JSON bodies
app.use(express.urlencoded({ extended: true }));

// ── Routes ────────────────────────────────────
app.use("/api/health", healthRoutes);
app.use("/api/public", publicSubmissionRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/university", universityRoutes);
app.use("/api/submissions", submissionRoutes);
app.use("/api/government", governmentRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/admin/analytics", analyticsRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/institutions", institutionRoutes);
app.use("/api/admin", institutionAdminRouter);
app.use("/api", industryRoutes);

// The production Render service hosts both the React site and the API. The
// mobile app continues to use /api while browsers receive the compiled client.
if (process.env.NODE_ENV === "production") {
  const clientDist = path.resolve(__dirname, "../../../client/dist");
  const clientIndex = path.join(clientDist, "index.html");
  if (existsSync(clientIndex)) {
    app.use(express.static(clientDist, { index: false, maxAge: "1h" }));
    app.get("/", (_req, res) => res.sendFile(clientIndex));
    app.get(/^\/(?!api(?:\/|$)).*/, (_req, res) => res.sendFile(clientIndex));
  }
}

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
