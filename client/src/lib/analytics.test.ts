import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { trackEvent } from "./analytics";

const originalWindow = globalThis.window;

afterEach(() => {
  globalThis.window = originalWindow;
});

test("tracking is a no-op when analytics is unavailable", () => {
  globalThis.window = {} as Window & typeof globalThis;

  assert.doesNotThrow(() => trackEvent("survey_link_clicked", { location: "home_survey_section" }));
});

test("tracking forwards only the provided event data", () => {
  const calls: Array<{ name: string; data?: Record<string, string | number | boolean> }> = [];
  globalThis.window = {
    umami: {
      track: (name, data) => calls.push({ name, data }),
    },
  } as Window & typeof globalThis;

  trackEvent("survey_link_clicked", { location: "home_survey_section" });

  assert.deepEqual(calls, [
    {
      name: "survey_link_clicked",
      data: { location: "home_survey_section" },
    },
  ]);
});

test("tracking errors do not interrupt the user interaction", () => {
  globalThis.window = {
    umami: {
      track: () => {
        throw new Error("analytics unavailable");
      },
    },
  } as Window & typeof globalThis;

  assert.doesNotThrow(() => trackEvent("survey_link_clicked", { location: "home_survey_section" }));
});