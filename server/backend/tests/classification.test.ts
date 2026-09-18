import { afterAll, beforeAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { Submission } from "../src/modules/submissions/submission.model";
import { ClassificationJob } from "../src/modules/classification/classification-job.model";
import { ClassificationResult } from "../src/modules/classification/classification-result.model";
import { classifyDeterministic, enqueueClassificationJob, processClassificationJob } from "../src/modules/classification/classification.service";

const database = `civicx_test_classification_${randomUUID().replaceAll("-", "")}`;

beforeAll(async () => {
  await mongoose.connect("mongodb://127.0.0.1:27017", { dbName: database, serverSelectionTimeoutMS: 5000 });
});

afterAll(async () => {
  if (mongoose.connection.name === database) await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

function submission(title: string, description: string, domain = "Public safety") {
  return Submission.create({
    submitterId: new mongoose.Types.ObjectId(),
    idempotencyKey: randomUUID(),
    title,
    description,
    domain,
    location: "Ranchi Ward 12",
    submitterType: "citizen",
    attachments: [],
    status: "submitted",
    analysis: { status: "pending" },
    comments: [],
    upvotes: 0,
  });
}

describe("Durable classification", () => {
  it("matches the labeled deterministic fixtures", () => {
    const fixturePath = path.resolve(process.cwd(), "../../docs/fixtures/classification.json");
    const fixtures = JSON.parse(fs.readFileSync(fixturePath, "utf8")) as Array<{ input: { title: string; description: string; domain: string }; expected: { category: string; priority: string } }>;
    for (const fixture of fixtures) {
      const result = classifyDeterministic(fixture.input);
      expect(result.category).toBe(fixture.expected.category);
      expect(result.priority).toBe(fixture.expected.priority);
    }
  });

  it("persists one job and result and updates the submission", async () => {
    const report = await submission("Broken road light", "An unsafe road crossing needs an urgent repair.");
    // Keep this persistence test deterministic even when a developer has a
    // real AI provider configured in their local environment.
    const first = await enqueueClassificationJob(report._id.toString(), "rules");
    const second = await enqueueClassificationJob(report._id.toString(), "rules");
    expect(first.reused).toBe(false);
    expect(second.reused).toBe(true);
    expect(second.record.jobId).toBe(first.record.jobId);

    await processClassificationJob(first.record.jobId);
    const job = await ClassificationJob.findOne({ submissionId: report._id });
    const result = await ClassificationResult.findOne({ submissionId: report._id });
    const updated = await Submission.findById(report._id);
    expect(job?.status).toBe("completed");
    expect(result?.category).toBe("Infrastructure");
    expect(result?.priority).toBe("high");
    expect(updated?.analysis.status).toBe("completed");
    expect(await ClassificationResult.countDocuments({ submissionId: report._id })).toBe(1);

    await processClassificationJob(first.record.jobId);
    expect(await ClassificationResult.countDocuments({ submissionId: report._id })).toBe(1);
  });

  it("records provider failure without losing the report and can retry", async () => {
    const report = await submission("Provider outage", "This report must remain available while classification is unavailable.");
    const job = await enqueueClassificationJob(report._id.toString(), "failing");
    await processClassificationJob(job.record.jobId);
    let failed = await ClassificationJob.findOne({ jobId: job.record.jobId });
    let updated = await Submission.findById(report._id);
    expect(failed?.status).toBe("failed");
    expect(failed?.lastError).toContain("provider unavailable");
    expect(updated?.analysis.status).toBe("failed");
    expect(await Submission.exists({ _id: report._id })).not.toBeNull();

    await ClassificationJob.updateOne({ jobId: job.record.jobId }, { $set: { provider: "rules", status: "pending", availableAt: new Date() } });
    await processClassificationJob(job.record.jobId);
    failed = await ClassificationJob.findOne({ jobId: job.record.jobId });
    updated = await Submission.findById(report._id);
    expect(failed?.status).toBe("completed");
    expect(updated?.analysis.status).toBe("completed");
  });
});
