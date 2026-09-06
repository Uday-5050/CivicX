import cors from "cors";
import config from "../config";

/**
 * CORS middleware with explicit allowlist.
 * Allows web (Vite), mobile (Flutter), and non-browser clients.
 */
const corsMiddleware = cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, server-to-server)
    if (!origin) {
      return callback(null, true);
    }

    if (config.corsOrigins.includes(origin)) {
      return callback(null, true);
    }

    // In development, allow all localhost origins
    if (config.isDev && origin.includes("localhost")) {
      return callback(null, true);
    }

    callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Request-Id"],
  exposedHeaders: ["X-Request-Id"],
});

export default corsMiddleware;
