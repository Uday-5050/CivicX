import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../src/app";

describe("GET /api/health", () => {
  it("returns health data with correct schema", async () => {
    const res = await request(app).get("/api/health");

    // Without MongoDB: 503 (degraded). With MongoDB: 200 (healthy).
    // Both are valid — the test checks the response shape, not the status.
    expect([200, 503]).toContain(res.status);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.meta).toBeDefined();

    // HealthData fields
    const { data } = res.body;
    expect(data.status).toMatch(/^(healthy|degraded)$/);
    expect(data.timestamp).toBeDefined();
    expect(typeof data.uptime).toBe("number");
    expect(data.environment).toMatch(/^(development|test)$/);
    expect(data.version).toBe("1.0.0");
    expect(data.mongo).toMatch(/^(connected|disconnected)$/);
  });

  it("includes X-Request-Id header in response", async () => {
    const res = await request(app).get("/api/health");

    expect(res.headers["x-request-id"]).toBeDefined();
    // UUID v4 format
    expect(res.headers["x-request-id"]).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
  });

  it("passes through client-supplied X-Request-Id", async () => {
    const clientId = "test-request-id-12345";
    const res = await request(app)
      .get("/api/health")
      .set("X-Request-Id", clientId);

    expect(res.headers["x-request-id"]).toBe(clientId);
    expect(res.body.meta.requestId).toBe(clientId);
  });

  it("returns meta with requestId and timestamp", async () => {
    const res = await request(app).get("/api/health");

    expect(res.body.meta.requestId).toBeDefined();
    expect(res.body.meta.timestamp).toBeDefined();
  });
});

describe("404 handling", () => {
  it("returns standard ErrorResponse for unknown routes", async () => {
    const res = await request(app).get("/api/nonexistent");

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("NOT_FOUND");
    expect(res.body.error.message).toContain("not found");
  });
});
