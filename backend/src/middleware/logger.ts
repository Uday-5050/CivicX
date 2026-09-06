import pino from "pino";
import pinoHttp from "pino-http";
import config from "../config";

/**
 * Structured logger with sensitive field redaction.
 * Never logs passwords, tokens, authorization headers, cookies, or secrets.
 */
export const logger = pino({
  level: config.logLevel,
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "req.body.password",
      "req.body.token",
      "req.body.secret",
      "req.body.apiKey",
      "req.body.refreshToken",
    ],
    censor: "[REDACTED]",
  },
  transport: config.isDev
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:standard",
          ignore: "pid,hostname",
        },
      }
    : undefined,
});

/**
 * HTTP request/response logging middleware.
 * Attaches request ID from req.id for correlation.
 */
export const httpLogger = pinoHttp({
  logger,
  genReqId: (req) => (req as Express.Request).id,
  customLogLevel: (_req, res, err) => {
    if (res.statusCode >= 500 || err) return "error";
    if (res.statusCode >= 400) return "warn";
    return "info";
  },
  serializers: {
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
  },
});
