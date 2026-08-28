import { spawnSync } from "node:child_process";

const result = spawnSync("npm", ["audit", "--omit=dev", "--json"], {
  encoding: "utf8",
});
const output = result.stdout.trim();

if (!output) {
  console.error("Production dependency audit did not return a JSON report.");
  if (result.stderr) console.error(result.stderr.trim());
  process.exit(1);
}

let report;
try {
  report = JSON.parse(output);
} catch {
  console.error("Production dependency audit returned invalid JSON.");
  console.error(output);
  process.exit(1);
}

const vulnerabilities = report.vulnerabilities || {};
const entries = Object.entries(vulnerabilities);
const unresolved = entries;

console.log(`Production dependency audit: ${entries.length} advisory entries.`);
for (const [name, finding] of entries) {
  console.log(`- unresolved: ${finding.severity} ${name}`);
}

if (unresolved.length > 0) {
  console.error(
    `Production dependency audit failed with ${unresolved.length} unresolved finding(s).`,
  );
  process.exit(1);
}

console.log("Production dependency audit passed.");