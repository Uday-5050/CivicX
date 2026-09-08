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

    // In development, allow Vite running on localhost or a private LAN address.
    if (config.isDev) {
      try {
        const hostname = new URL(origin).hostname;
        if (hostname === "localhost" || hostname === "127.0.0.1" || /^10\./.test(hostname) || /^192\.168\./.test(hostname) || /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)) return callback(null, true);
      } catch {
        // Invalid origins are handled by the regular CORS rejection below.
      }
    }

    callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Request-Id"],
  exposedHeaders: ["X-Request-Id"],
});

export default corsMiddleware;
