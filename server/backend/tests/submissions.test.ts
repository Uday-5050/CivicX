import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import mongoose from "mongoose";
import { randomUUID } from "node:crypto";
import request from "supertest";

vi.mock("../src/config/cloudinary", () => ({
  cloudinaryConfigured: true,
  cloudinary: {
    uploader: {
      upload_stream: (_options: unknown, callback: (error: unknown, result?: { public_id: string; secure_url: string }) => void) => ({
        end: () => callback(undefined, { public_id: "civicx/reports/test-image", secure_url: "https://res.cloudinary.com/civicx/image/upload/test-image.jpg" }),
      }),
    },
  },
}));

import app from "../src/app";
import { User } from "../src/modules/auth/user.model";
import { signAccessToken } from "../src/modules/auth/auth.service";

const database = `civicx_test_submissions_${randomUUID().replaceAll("-", "")}`;
let citizenToken: string;
let otherCitizenToken: string;
const report = { title: "Unsafe school crossing", description: "Cars speed near the school crossing and students need a safer crossing immediately.", domain: "Public safety", location: "Ranchi Ward 12", submitterType: "citizen", attachments: [], idempotencyKey: "school-crossing" };

beforeAll(async () => {
  await mongoose.connect("mongodb://127.0.0.1:27017", { dbName: database, serverSelectionTimeoutMS: 5000 });
  async function token(email: string) {
    const user = await User.create({ name: "Test citizen", email, passwordHash: "unused", role: "citizen", accountStatus: "active" });
    return signAccessToken(user);
  }
  citizenToken = await token(`${randomUUID()}@example.test`);
  otherCitizenToken = await token(`${randomUUID()}@example.test`);
});

afterAll(async () => {
  if (mongoose.connection.name === database) await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

describe("Citizen submissions", () => {
  it("stores a report and returns it only to its submitter", async () => {
    const created = await request(app).post("/api/submissions").auth(citizenToken, { type: "bearer" }).send(report);
    expect(created.status).toBe(201);
    expect(created.body.data.status).toBe("submitted");
    expect(created.body.data.submitterType).toBe("citizen");
    const own = await request(app).get("/api/submissions").auth(citizenToken, { type: "bearer" });
    expect(own.body.data).toHaveLength(1);
    expect(own.body.data[0].id).toBe(created.body.data.id);
    const other = await request(app).get("/api/submissions").auth(otherCitizenToken, { type: "bearer" });
    expect(other.body.data).toEqual([]);
  });

  it("returns the original submission for the same idempotency key", async () => {
    const first = await request(app).post("/api/submissions").auth(citizenToken, { type: "bearer" }).send({ ...report, idempotencyKey: "same-report" });
    const repeat = await request(app).post("/api/submissions").auth(citizenToken, { type: "bearer" }).send({ ...report, idempotencyKey: "same-report" });
    expect(first.status).toBe(201);
    expect(repeat.status).toBe(200);
    expect(repeat.body.data.id).toBe(first.body.data.id);
  });

  it("stores an uploaded image and returns its Cloudinary URL", async () => {
    const response = await request(app)
      .post("/api/submissions")
      .auth(citizenToken, { type: "bearer" })
      .field("title", report.title)
      .field("description", report.description)
      .field("domain", report.domain)
      .field("location", report.location)
      .field("idempotencyKey", "photo-report")
      .attach("attachments", Buffer.from([0xff, 0xd8, 0xff, 0xd9]), { filename: "report.jpg", contentType: "image/jpeg" });
    expect(response.status).toBe(201);
    const attachment = response.body.data.attachments[0];
    expect(attachment.previewUrl).toBe("https://res.cloudinary.com/civicx/image/upload/test-image.jpg");
  });

  it("requires an authenticated citizen", async () => {
    expect((await request(app).post("/api/submissions").send(report)).status).toBe(401);
  });
});
