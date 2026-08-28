import { storage } from "./storage";
import { pool } from "./db";

/**
 * Explicit administrator provisioning entry point.
 *
 * Set ADMIN_BOOTSTRAP_EMAIL and ADMIN_BOOTSTRAP_PASSWORD in the deployment
 * environment, then run `npm run admin:bootstrap`. The command is intentionally
 * not an HTTP route: public visitors cannot claim administrator access by
 * registering an account. When the account already exists, the password is
 * left unchanged and its authorization state is repaired atomically.
 */
async function main() {
  const email = process.env.ADMIN_BOOTSTRAP_EMAIL?.trim();
  const password = process.env.ADMIN_BOOTSTRAP_PASSWORD;

  if (!email) {
    throw new Error("ADMIN_BOOTSTRAP_EMAIL must be set");
  }

  const user = await storage.bootstrapAdmin(email, password);
  console.log(`Administrator provisioning completed for ${user.email}`);
}

main()
  .catch((error) => {
    console.error("Administrator provisioning failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });