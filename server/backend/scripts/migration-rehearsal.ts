import "dotenv/config";
import mongoose from "mongoose";
import config from "../src/config";
import { rehearseLegacyMigration } from "../src/modules/migrations/legacy-challenge-migration.service";

async function main() {
  await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 10_000 });
  try {
    const report = await rehearseLegacyMigration();
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Migration rehearsal failed");
  process.exitCode = 1;
});
