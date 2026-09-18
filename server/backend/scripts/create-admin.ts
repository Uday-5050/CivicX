import mongoose from "mongoose";
import config from "../src/config";
import { hashPassword, normalizeEmail } from "../src/modules/auth/auth.service";
import { User } from "../src/modules/auth/user.model";

async function main() {
  const name = process.env.ADMIN_NAME?.trim() || "CivicX Administrator";
  const email = normalizeEmail(process.env.ADMIN_EMAIL || "");
  const password = process.env.ADMIN_PASSWORD || "";

  if (!email || password.length < 12) {
    throw new Error("Set ADMIN_EMAIL and an ADMIN_PASSWORD of at least 12 characters.");
  }

  await mongoose.connect(config.mongoUri);
  const existing = await User.findOne({ email });
  if (existing) throw new Error(`An account already exists for ${email}; no account was changed.`);

  const user = await User.create({
    name,
    email,
    passwordHash: await hashPassword(password),
    role: "admin",
    accountStatus: "active",
  });

  process.stdout.write(JSON.stringify({ id: user._id.toString(), name, email, role: user.role, accountStatus: user.accountStatus }));
}

main()
  .catch((error) => {
    process.stderr.write(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => mongoose.disconnect());
