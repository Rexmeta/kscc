#!/usr/bin/env node

import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";

const baseUrl = process.argv[2] || "https://kscc.kr";
const runsArg = process.argv.find((arg) => arg.startsWith("--runs="));
const runs = Math.max(1, Number.parseInt(runsArg?.split("=")[1] || "3", 10));
const routes = ["/", "/news", "/events", "/resources"];
const baseOrigin = new URL(baseUrl).origin;
const chromiumPath =
  process.env.REPLIT_PLAYWRIGHT_CHROMIUM_EXECUTABLE || "chromium";

const profiles = {
  mobile: {
    viewport: { width: 390, height: 844, deviceScaleFactor: 1, mobile: true },
    network: { latency: 150, downloadThroughput: 1_600_000, uploadThroughput: 750_000 },
    cpuThrottlingRate: 4,
  },
  desktop: {
    viewport: { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false },
    network: { latency: 0, downloadThroughput: -1, uploadThroughput: -1 },
    cpuThrottlingRate: 1,
  },
};
let performanceScriptAdded = false;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class CdpConnection {
  #nextId = 0;
  #pending = new Map();
  #listeners = new Map();

  constructor(socket) {
    this.socket = socket;
    socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.id && this.#pending.has(message.id)) {
        const { resolve, reject } = this.#pending.get(message.id);
        this.#pending.delete(message.id);
        if (message.error) reject(new Error(message.error.message));
        else resolve(message.result);
      }
      const listeners = this.#listeners.get(message.method) || [];
      for (const listener of listeners) listener(message);
    });
  }

  send(method, params = {}, sessionId) {
    const id = ++this.#nextId;
    const message = { id, method, params };
    if (sessionId) message.sessionId = sessionId;
    return new Promise((resolve, reject) => {
      this.#pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify(message));
    });
  }

  on(method, listener) {
    const listeners = this.#listeners.get(method) || [];
    listeners.push(listener);
    this.#listeners.set(method, listeners);
  }

  close() {
    this.socket.close();
  }
}

async function openCdp() {
  const userDataDir = `/tmp/kscc-performance-${randomUUID()}`;
  const chrome = spawn(
    chromiumPath,
    [
      "--headless=new",
      "--no-sandbox",
      "--disable-gpu",
      "--disable-dev-shm-usage",
      "--remote-debugging-port=0",
      `--user-data-dir=${userDataDir}`,
      "about:blank",
    ],
    { stdio: ["ignore", "ignore", "pipe"] },
  );

  let stderr = "";
  let resolveEndpoint;
  const endpointPromise = new Promise((resolve) => {
    resolveEndpoint = resolve;
  });
  chrome.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
    const match = stderr.match(/DevTools listening on (ws:\/\/\S+)/);
    if (match) resolveEndpoint(match[1]);
  });

  const endpoint = await Promise.race([
    endpointPromise,
    sleep(15_000).then(() => {
      throw new Error("Timed out waiting for Chromium DevTools");
    }),
  ]);
  const socket = new WebSocket(endpoint);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  const cdp = new CdpConnection(socket);
  const { targetId } = await cdp.send("Target.createTarget", {
    url: "about:blank",
  });
  const { sessionId } = await cdp.send("Target.attachToTarget", {
    targetId,
    flatten: true,
  });
  return {
    cdp,
    sessionId,
    close: async () => {
      try {
        await cdp.send("Browser.close");
      } finally {
        chrome.kill("SIGTERM");
      }
    },
  };
}

function waitForEvent(cdp, method, predicate = () => true, timeoutMs = 30_000) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Timed out waiting for ${method}`));
    }, timeoutMs);
    cdp.on(method, (message) => {
      if (message.sessionId && predicate(message)) {
        clearTimeout(timeout);
        resolve(message.params);
      }
    });
  });
}

async function evaluate(cdp, sessionId, expression) {
  const result = await cdp.send(
    "Runtime.evaluate",
    { expression, returnByValue: true, awaitPromise: true },
    sessionId,
  );
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text || "Browser evaluation failed");
  }
  return result.result?.value;
}

async function tracePage({ cdp, sessionId }, profileName, route, sample) {
  const profile = profiles[profileName];
  const requests = new Map();
  const startedAt = Date.now();
  let loadTimestamp;

  const onRequest = ({ params, sessionId: eventSession }) => {
    if (eventSession !== sessionId) return;
    requests.set(params.requestId, {
      url: params.request.url,
      resourceType: params.type,
      mimeType: "",
      startTime: params.timestamp,
      endTime: null,
      encodedDataLength: 0,
      status: null,
    });
  };
  const onResponse = ({ params, sessionId: eventSession }) => {
    if (eventSession !== sessionId) return;
    const request = requests.get(params.requestId);
    if (!request) return;
    request.mimeType = params.response.mimeType || "";
    request.status = params.response.status;
    request.responseStart = params.response.timing?.receiveHeadersStart;
  };
  const onFinished = ({ params, sessionId: eventSession }) => {
    if (eventSession !== sessionId) return;
    const request = requests.get(params.requestId);
    if (!request) return;
    request.endTime = params.timestamp;
    request.encodedDataLength = params.encodedDataLength || 0;
  };
  cdp.on("Network.requestWillBeSent", onRequest);
  cdp.on("Network.responseReceived", onResponse);
  cdp.on("Network.loadingFinished", onFinished);

  await cdp.send("Page.stopLoading", {}, sessionId);
  await cdp.send("Network.enable", {}, sessionId);
  await cdp.send("Network.clearBrowserCache", {}, sessionId);
  await cdp.send("Network.setCacheDisabled", { cacheDisabled: true }, sessionId);
  await cdp.send("Page.enable", {}, sessionId);
  await cdp.send("Runtime.enable", {}, sessionId);
  await cdp.send(
    "Emulation.setDeviceMetricsOverride",
    { ...profile.viewport, screenWidth: profile.viewport.width, screenHeight: profile.viewport.height },
    sessionId,
  );
  await cdp.send(
    "Emulation.setCPUThrottlingRate",
    { rate: profile.cpuThrottlingRate },
    sessionId,
  );
  await cdp.send(
    "Network.emulateNetworkConditions",
    { offline: false, ...profile.network, connectionType: "cellular3g" },
    sessionId,
  );
  if (!performanceScriptAdded) {
    await cdp.send(
      "Page.addScriptToEvaluateOnNewDocument",
      {
        source: `(() => {
          window.__ksccPerf = { cls: 0, lcp: null, shifts: [] };
          try {
            new PerformanceObserver((list) => {
              for (const entry of list.getEntries()) {
                if (entry.entryType === "largest-contentful-paint") {
                  window.__ksccPerf.lcp = entry.startTime;
                }
              }
            }).observe({ type: "largest-contentful-paint", buffered: true });
            new PerformanceObserver((list) => {
              for (const entry of list.getEntries()) {
                if (!entry.hadRecentInput) {
                  window.__ksccPerf.cls += entry.value;
                  window.__ksccPerf.shifts.push({
                    value: entry.value,
                    sources: (entry.sources || []).slice(0, 3).map((source) => {
                      const node = source.node;
                      return node ? {
                        tag: node.tagName,
                        id: node.id || "",
                        className: typeof node.className === "string" ? node.className.slice(0, 120) : "",
                      } : null;
                    }),
                  });
                }
              }
            }).observe({ type: "layout-shift", buffered: true });
          } catch {}
        })();`,
      },
      sessionId,
    );
    performanceScriptAdded = true;
  }

  const loadEvent = waitForEvent(
    cdp,
    "Page.loadEventFired",
    ({ sessionId: eventSession }) => eventSession === sessionId,
    45_000,
  ).then(() => true).catch(() => false);
  const url = new URL(route, baseUrl).toString();
  await cdp.send("Page.navigate", { url }, sessionId);
  const loadCompleted = await Promise.race([
    loadEvent,
    sleep(15_000).then(() => false),
  ]);
  loadTimestamp = loadCompleted ? Date.now() : null;
  await sleep(2_000);

  const browserMetrics = await evaluate(
    cdp,
    sessionId,
    `(() => {
      const navigation = performance.getEntriesByType("navigation")[0];
      const resourceEntries = performance.getEntriesByType("resource");
      const resourceTiming = resourceEntries.map((entry) => ({
        name: entry.name,
        initiatorType: entry.initiatorType,
        startTime: entry.startTime,
        responseStart: entry.responseStart,
        duration: entry.duration,
        transferSize: entry.transferSize,
        encodedBodySize: entry.encodedBodySize,
      }));
      return {
        navigation: navigation ? {
          ttfb: navigation.responseStart - navigation.requestStart,
          domContentLoaded: navigation.domContentLoadedEventEnd,
          load: navigation.loadEventEnd,
        } : null,
        perf: window.__ksccPerf || { cls: 0, lcp: null, shifts: [] },
        resourceTiming,
      };
    })()`,
  );

  const completed = [...requests.values()].filter((request) => request.endTime);
  const byType = (type, firstPartyOnly = false) =>
    completed.filter(
      (request) =>
        (!firstPartyOnly || new URL(request.url).origin === baseOrigin) &&
        (request.resourceType.toLowerCase() === type ||
        (type === "script" && request.mimeType.includes("javascript")) ||
        (type === "stylesheet" && request.mimeType.includes("css"))),
    );
  const sumBytes = (items) =>
    items.reduce((total, item) => total + (item.encodedDataLength || 0), 0);
  const apiRequests = completed
    .filter((request) => request.url.includes("/api/"))
    .map((request) => ({
      url: new URL(request.url).pathname + new URL(request.url).search,
      resourceType: request.resourceType,
      status: request.status,
      durationMs: Math.round((request.endTime - request.startTime) * 1000),
      transferBytes: request.encodedDataLength,
    }))
    .sort((a, b) => b.durationMs - a.durationMs);

  return {
    profile: profileName,
    route,
    sample,
    url,
    capturedAt: new Date().toISOString(),
    viewport: profile.viewport,
    network: profile.network,
    cpuThrottlingRate: profile.cpuThrottlingRate,
    loadCompleted,
    metrics: {
      lcpMs: browserMetrics.perf.lcp == null ? null : Math.round(browserMetrics.perf.lcp),
      cls: Number(browserMetrics.perf.cls.toFixed(4)),
      ttfbMs:
        browserMetrics.navigation?.ttfb == null
          ? null
          : Math.round(browserMetrics.navigation.ttfb),
      loadMs: browserMetrics.navigation?.load == null
        ? null
        : Math.round(browserMetrics.navigation.load),
      requestCount: completed.length,
      javascriptTransferBytes: sumBytes(byType("script", true)),
      cssTransferBytes: sumBytes(byType("stylesheet", true)),
      fontStylesheetTransferBytes: sumBytes(byType("stylesheet")) - sumBytes(byType("stylesheet", true)),
      imageTransferBytes: sumBytes(byType("image")),
    },
    apiRequests,
    apiTimingSummary: {
      count: apiRequests.length,
      totalTransferBytes: apiRequests.reduce((total, item) => total + item.transferBytes, 0),
      slowestMs: apiRequests[0]?.durationMs || 0,
    },
    layoutShifts: browserMetrics.perf.shifts,
    resourceTiming: browserMetrics.resourceTiming,
    loadTimestamp,
    elapsedMs: Date.now() - startedAt,
  };
}

function median(values) {
  const numbers = values.filter((value) => value != null).sort((a, b) => a - b);
  if (!numbers.length) return null;
  return numbers[Math.floor(numbers.length / 2)];
}

function summarize(results) {
  const grouped = new Map();
  for (const result of results) {
    const key = `${result.profile} ${result.route}`;
    const group = grouped.get(key) || [];
    group.push(result);
    grouped.set(key, group);
  }
  return [...grouped.entries()].map(([key, group]) => {
    const [profile, route] = key.split(" ");
    const metrics = ["lcpMs", "cls", "ttfbMs", "loadMs", "requestCount", "javascriptTransferBytes", "cssTransferBytes", "fontStylesheetTransferBytes", "imageTransferBytes"];
    return {
      profile,
      route,
      samples: group.length,
      median: Object.fromEntries(metrics.map((metric) => [metric, median(group.map((item) => item.metrics[metric]))])),
      api: {
        requestCount: median(group.map((item) => item.apiTimingSummary.count)),
        slowestMs: median(group.map((item) => item.apiTimingSummary.slowestMs)),
        totalTransferBytes: median(group.map((item) => item.apiTimingSummary.totalTransferBytes)),
      },
    };
  });
}

const browser = await openCdp();
try {
  const results = [];
  for (const profileName of Object.keys(profiles)) {
    for (const route of routes) {
      for (let sample = 1; sample <= runs; sample += 1) {
        results.push(await tracePage(browser, profileName, route, sample));
        process.stderr.write(`captured ${profileName} ${route} sample ${sample}/${runs}\n`);
      }
    }
  }
  console.log(JSON.stringify({
    schemaVersion: 1,
    baseUrl: new URL(baseUrl).origin,
    routes,
    runs,
    profiles,
    results,
    summary: summarize(results),
  }, null, 2));
} finally {
  await browser.close();
}