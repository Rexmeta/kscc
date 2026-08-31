import { spawnSync } from "node:child_process";

const result = spawnSync("npx", ["drizzle-kit", "check"], {
  encoding: "utf8",
  env: process.env,
});

if (result.status !== 0) {
  console.error("Schema/migration check failed. Review the migration history before release.");
  if (result.stdout?.trim()) console.error(result.stdout.trim());
  if (result.stderr?.trim()) console.error(result.stderr.trim());
  process.exit(result.status || 1);
}

console.log("Schema/migration check passed.");