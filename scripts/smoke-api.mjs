const baseUrl = (process.env.SMOKE_BASE_URL || `http://127.0.0.1:${process.env.PORT || 5000}`)
  .replace(/\/+$/, "");
const timeoutMs = 5_000;

async function check(path, expectedStatus, expectedBody) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    const body = await response.text();
    if (response.status !== expectedStatus) {
      throw new Error(`${path} returned HTTP ${response.status}; expected ${expectedStatus}`);
    }
    if (expectedBody !== undefined) {
      let parsed;
      try {
        parsed = JSON.parse(body);
      } catch {
        throw new Error(`${path} did not return JSON`);
      }
      if (JSON.stringify(parsed) !== JSON.stringify(expectedBody)) {
        throw new Error(`${path} returned an unexpected health response`);
      }
    }
    console.log(`Smoke check passed: ${path}`);
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error(`${path} timed out after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

try {
  await check("/healthz", 200, { status: "ok" });
  await check("/readyz", 200, { status: "ready" });
  await check("/api/posts?postType=event&limit=1", 200);
  await check("/api/posts?postType=news&limit=1", 200);
  await check("/api/members?limit=1", 200);
  console.log("Representative API smoke checks passed.");
} catch (error) {
  console.error(`API smoke checks failed: ${error instanceof Error ? error.message : "unknown error"}`);
  process.exit(1);
}