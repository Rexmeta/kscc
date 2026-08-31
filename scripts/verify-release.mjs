import { spawn, spawnSync } from "node:child_process";

function runStep(label, command, args, env = process.env) {
  console.log(`\n==> ${label}`);
  const result = spawnSync(command, args, {
    stdio: "inherit",
    env,
  });
  if (result.status !== 0) {
    console.error(`Release verification stopped: ${label} failed.`);
    process.exit(result.status || 1);
  }
}

runStep("Type check", "npm", ["run", "check"]);
runStep("Tests", "npm", ["test"]);
runStep("Production dependency audit", "npm", ["run", "audit:production"]);
runStep("Schema and migration check", "npm", ["run", "db:check"]);
runStep("Production build", "npm", ["run", "build"]);

const port = process.env.RELEASE_SMOKE_PORT || "5080";
const child = spawn("npm", ["start"], {
  stdio: "inherit",
  env: { ...process.env, NODE_ENV: "production", PORT: port },
});
let stopped = false;

function stopServer() {
  if (!stopped) {
    stopped = true;
    child.kill("SIGTERM");
  }
}

async function waitForServerExit() {
  if (child.exitCode !== null) return;
  await new Promise((resolve) => {
    const timeout = setTimeout(() => {
      child.kill("SIGKILL");
      resolve();
    }, 5_000);
    child.once("exit", () => {
      clearTimeout(timeout);
      resolve();
    });
  });
}

process.on("SIGINT", () => {
  stopServer();
  process.exit(130);
});
process.on("SIGTERM", () => {
  stopServer();
  process.exit(143);
});

const deadline = Date.now() + 30_000;
let started = false;
while (Date.now() < deadline && !started) {
  if (child.exitCode !== null) break;
  try {
    const response = await fetch(`http://127.0.0.1:${port}/healthz`, {
      signal: AbortSignal.timeout(1_000),
    });
    started = response.status === 200;
  } catch {
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
}

if (!started) {
  stopServer();
  await waitForServerExit();
  console.error("Release verification stopped: production server did not become healthy within 30 seconds.");
  process.exit(1);
}

try {
  runStep("API smoke checks", "node", ["scripts/smoke-api.mjs"], {
    ...process.env,
    SMOKE_BASE_URL: `http://127.0.0.1:${port}`,
  });
} finally {
  stopServer();
  await waitForServerExit();
}

console.log("\nRelease verification passed.");