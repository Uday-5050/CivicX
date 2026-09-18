# CivicX — Architecture Decisions

This document records key architectural decisions for the CivicX backend.

---

## ADR-001: TypeScript for Backend

**Status:** Accepted  
**Date:** 2025-09-06

**Context:** The project uses React (JavaScript) on the web client and Flutter (Dart) on mobile. The backend needs strong typing for API contracts and maintainability.

**Decision:** Use TypeScript with strict mode for the entire backend codebase.

**Consequences:**
- Compile-time type safety for API request/response shapes
- Shared type definitions can be exported for the web client
- Adds a build step (`tsc`) before production deployment

---

## ADR-002: Mongoose as ODM

**Status:** Accepted  
**Date:** 2025-09-06

**Context:** MongoDB is the chosen database. We need schema validation, middleware hooks, and transaction support.

**Decision:** Use Mongoose with TypeScript interfaces for all database models. Set up MongoDB as a replica set locally to enable transaction tests.

**Consequences:**
- Schema-level validation in addition to Zod request validation
- Transaction support requires replica set (even locally)
- Mongoose middleware enables audit trails and soft deletes

---

## ADR-003: Modular folder structure

**Status:** Accepted  
**Date:** 2025-09-06

**Context:** The backend will grow to include issues, users, AI analysis, notifications, and jobs. A flat file structure will not scale.

**Decision:** Organize code by domain module:
```
server/backend/src/
├── modules/       ← Feature domains (health, issues, users, etc.)
├── middleware/     ← Express middleware (cross-cutting)
├── adapters/       ← External service integrations (AI, email, etc.)
├── jobs/           ← Background job runners
├── config/         ← Environment and app configuration
└── utils/          ← Shared helpers (errors, response envelope)
```

Each module contains its own routes, controller, service, model, and validation schemas.

**Consequences:**
- Clear ownership per feature
- Easy to add new modules without touching existing ones
- Each module can be tested independently

---

## ADR-004: AI as an internal adapter

**Status:** Accepted  
**Date:** 2025-09-06

**Context:** The prompt specifies AI starts as an adapter inside the backend. No fourth developer or Python service required.

**Decision:** AI functionality lives in `server/backend/src/adapters/ai/`. The rules classifier remains the default safety baseline. An optional OpenAI-compatible provider is called server-side with redacted, length-capped text and strict JSON validation; provider failures fall back to rules without blocking a report.

**Consequences:**
- No external AI service dependency for the default workflow
- Other modules call the adapter through a clean interface
- Provider credentials never enter the client or repository
- Provider output is advisory and cannot directly reject, route, resolve, or advance a record

---

## ADR-005: Centralized error handling

**Status:** Accepted  
**Date:** 2025-09-06

**Context:** Consistent error responses are critical for both web and mobile clients to parse.

**Decision:** All errors flow through a centralized `errorHandler` middleware. Custom `AppError` class carries HTTP status codes and machine-readable error codes. Response format matches the `ErrorResponse` schema in `docs/openapi.yaml`.

**Consequences:**
- Consistent error shape across all endpoints
- Clients can rely on `error.code` for programmatic handling
- Stack traces only exposed in development

---

## ADR-006: Structured logging with redaction

**Status:** Accepted  
**Date:** 2025-09-06

**Context:** Logs must never contain credentials, tokens, or private data (per operating prompt).

**Decision:** Use Pino for structured JSON logging. Configure redaction paths for sensitive fields (`password`, `token`, `authorization`, `cookie`, `secret`).

**Consequences:**
- Machine-parseable logs for production monitoring
- Sensitive data automatically redacted
- Request ID correlation across log entries

---

## ADR-007: Zod for request validation

**Status:** Accepted  
**Date:** 2025-09-06

**Context:** Input validation must happen at the API boundary before data reaches business logic.

**Decision:** Use Zod schemas for request body/query/params validation. A generic `validate` middleware wraps Zod and returns errors in the standard `ErrorResponse` format.

**Consequences:**
- Type-safe validation with TypeScript inference
- Validation errors include field-level detail
- Schemas can be reused for documentation
