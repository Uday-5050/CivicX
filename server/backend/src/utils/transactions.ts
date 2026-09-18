import mongoose, { type ClientSession } from "mongoose";

/** Run a unit of work in a MongoDB transaction and always close the session. */
export async function withMongoTransaction<T>(work: (session?: ClientSession) => Promise<T>): Promise<T> {
  const session = await mongoose.startSession();
  try {
    try {
      return await session.withTransaction((activeSession) => work(activeSession));
    } catch (error: unknown) {
      // Local MongoDB installations are often standalone servers. Atlas and
      // production use transactions; for standalone development, the caller's
      // atomic compare-and-set operations still protect the workflow.
      const code = typeof error === "object" && error !== null && "code" in error ? (error as { code?: unknown }).code : undefined;
      if (code !== 20) throw error;
      return await work(undefined);
    }
  } finally {
    await session.endSession();
  }
}
