import type { ClientSession, FilterQuery, Model, UpdateQuery } from "mongoose";
import { ConflictError } from "./errors";

type VersionedRecord = { version: number };

/** Update a versioned record only when the caller still owns the expected version. */
export async function updateWithExpectedVersion<T extends VersionedRecord>(
  model: Model<T>,
  filter: FilterQuery<T>,
  expectedVersion: number,
  update: UpdateQuery<T>,
  conflictMessage = "This record changed. Refresh and retry.",
  session?: ClientSession,
): Promise<T> {
  const currentIncrement = update.$inc && typeof update.$inc === "object" ? update.$inc : {};
  const updated = await model.findOneAndUpdate(
    { ...filter, version: expectedVersion },
    { ...update, $inc: { ...currentIncrement, version: 1 } },
    { new: true, runValidators: true, session },
  );
  if (!updated) throw ConflictError(conflictMessage);
  return updated;
}

/** Create once and return the original record for concurrent/retried calls. */
export async function createIdempotent<T>(
  findExisting: () => Promise<T | null>,
  create: () => Promise<T>,
): Promise<{ record: T; reused: boolean }> {
  const existing = await findExisting();
  if (existing) return { record: existing, reused: true };
  try {
    return { record: await create(), reused: false };
  } catch (error: unknown) {
    if (typeof error === "object" && error !== null && "code" in error && (error as { code?: unknown }).code === 11000) {
      const concurrent = await findExisting();
      if (concurrent) return { record: concurrent, reused: true };
    }
    throw error;
  }
}
