import mongoose from "mongoose";
import config from "../config";
import { registerSchema } from "../modules/auth/auth.schemas";
import { hashPassword } from "../modules/auth/auth.service";
import { User } from "../modules/auth/user.model";

async function main() {
  const input = registerSchema.safeParse({ name: process.env.GOVERNMENT_NAME,
    email: process.env.GOVERNMENT_EMAIL, password: process.env.GOVERNMENT_PASSWORD });
  if (!input.success) throw new Error("Set GOVERNMENT_NAME, GOVERNMENT_EMAIL and GOVERNMENT_PASSWORD (at least 8 characters).");
  await mongoose.connect(config.mongoUri);
  if (await User.exists({ email: input.data.email })) throw new Error("Account already exists; no changes made.");
  await User.create({ name: input.data.name, email: input.data.email,
    passwordHash: await hashPassword(input.data.password), role: "government", accountStatus: "active" });
  console.log("Government account created. Sign in at /#/government.");
}
main().catch(error => { console.error(error instanceof Error ? error.message : "Account creation failed"); process.exitCode = 1; })
  .finally(async () => { await mongoose.disconnect(); });
