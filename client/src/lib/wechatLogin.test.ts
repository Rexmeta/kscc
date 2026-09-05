import assert from "node:assert/strict";
import { test } from "node:test";
import { parseWechatCallback } from "./wechatLogin";

test("WeChat callback parser accepts only an opaque success code", () => {
  assert.deepEqual(parseWechatCallback("?code=opaque-handoff-code"), {
    code: "opaque-handoff-code",
  });
  assert.deepEqual(parseWechatCallback("?error=cancelled"), { error: "cancelled" });
  assert.deepEqual(parseWechatCallback("?code=opaque&error=cancelled"), { error: "cancelled" });
  assert.deepEqual(parseWechatCallback(""), { error: "invalid_callback" });
});