import { spawnSync } from "node:child_process";

const allowedAdvisories = new Set([
  "1119441",
  "GHSA-w5hq-g745-h8pq",
]);

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
const visiting = new Set();
const resolved = new Map();

function advisoryIsAllowed(advisory) {
  return allowedAdvisories.has(String(advisory.source))
    || (typeof advisory.url === "string"
      && [...allowedAdvisories].some((id) => advisory.url.includes(id)));
}

function findingIsAllowed(name) {
  if (resolved.has(name)) return resolved.get(name);
  if (visiting.has(name)) return false;

  const finding = vulnerabilities[name];
  if (!finding) return false;

  visiting.add(name);
  const allowed = (finding.via || []).length > 0
    && finding.via.every((dependency) =>
      typeof dependency === "string"
        ? findingIsAllowed(dependency)
        : advisoryIsAllowed(dependency),
    );
  visiting.delete(name);
  resolved.set(name, allowed);
  return allowed;
}

const unresolved = entries.filter(([name, finding]) =>
  !findingIsAllowed(name)
  || finding.severity === "high"
  || finding.severity === "critical",
);

console.log(`Production dependency audit: ${entries.length} advisory entries.`);
for (const [name, finding] of entries) {
  const status = findingIsAllowed(name) ? "documented exception" : "unresolved";
  console.log(`- ${status}: ${finding.severity} ${name}`);
}

if (unresolved.length > 0) {
  console.error(
    `Production dependency audit failed with ${unresolved.length} unresolved finding(s).`,
  );
  process.exit(1);
}

console.log("Production dependency audit passed.");