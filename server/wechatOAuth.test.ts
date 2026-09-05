import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import jwt from "jsonwebtoken";
import {
  createSignedState,
  exchangeWechatCode,
  getCookieValue,
  getWechatAuthorizeUrl,
  verifySignedState,
  WECHAT_STATE_TTL_MS,
} from "./wechatOAuth";
import { issueAuthToken } from "./auth";

const databaseAvailable = Boolean(process.env.DATABASE_URL);

test("WeChat state is signed, bound to its cookie, and expires", () => {
  const secret = "oauth-test-secret";
  const now = 1_700_000_000_000;
  const state = createSignedState(secret, now);

  assert.equal(verifySignedState(state, state, secret, now), true);
  assert.equal(verifySignedState(state, "different-state", secret, now), false);
  assert.equal(verifySignedState(`${state}x`, state, secret, now), false);
  assert.equal(verifySignedState(state, state, secret, now + WECHAT_STATE_TTL_MS + 1), false);
});

test("WeChat cookie parsing and QR URL use the fixed web-login scope", () => {
  const state = "signed.state.value";
  assert.equal(getCookieValue(`other=value; wechat_oauth_state=${encodeURIComponent(state)}`, "wechat_oauth_state"), state);
  const url = getWechatAuthorizeUrl({
    appId: "app-id",
    appSecret: "not-used-in-url",
    redirectUri: "https://example.test/api/auth/wechat/callback",
  }, state);
  const parsed = new URL(url);
  assert.equal(parsed.hostname, "open.weixin.qq.com");
  assert.equal(parsed.searchParams.get("scope"), "snsapi_login");
  assert.equal(parsed.searchParams.get("appid"), "app-id");
  assert.equal(parsed.searchParams.get("state"), state);
  assert.equal(parsed.searchParams.get("secret"), null);
});

test("WeChat provider responses must contain an openid and never expose provider errors", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response(JSON.stringify({
      access_token: "provider-token",
      openid: "app-scoped-id",
      unionid: "stable-union-id",
    }), { status: 200, headers: { "content-type": "application/json" } });
    const identity = await exchangeWechatCode({
      appId: "app-id",
      appSecret: "secret",
      redirectUri: "https://example.test/api/auth/wechat/callback",
    }, "one-time-provider-code");
    assert.deepEqual(identity, { openId: "app-scoped-id", unionId: "stable-union-id" });

    globalThis.fetch = async () => new Response(JSON.stringify({
      errcode: 40163,
      errmsg: "code been used",
    }), { status: 200, headers: { "content-type": "application/json" } });
    await assert.rejects(
      () => exchangeWechatCode({
        appId: "app-id",
        appSecret: "secret",
        redirectUri: "https://example.test/api/auth/wechat/callback",
      }, "used-code"),
      /provider_rejected_code/,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test(
  "WeChat identities resolve concurrently by unionid and handoffs are one-time",
  { skip: !databaseAvailable },
  async () => {
    const [{ db }, { storage }, schema, { count, eq }] = await Promise.all([
      import("./db"),
      import("./storage"),
      import("@shared/schema"),
      import("drizzle-orm"),
    ]);
    const suffix = randomUUID();
    const identity = {
      appId: `wechat-test-app-${suffix}`,
      openId: `wechat-test-open-${suffix}`,
      unionId: `wechat-test-union-${suffix}`,
    };
    let userId: string | undefined;

    try {
      const resolvedUsers = await Promise.all(
        Array.from({ length: 4 }, () => storage.resolveWechatUser(identity)),
      );
      userId = resolvedUsers[0].id;
      assert.ok(resolvedUsers.every((user) => user.id === userId));
      assert.equal(resolvedUsers[0].email, null);
      assert.equal(resolvedUsers[0].password, null);
      assert.equal(resolvedUsers[0].role, "user");

      const resolvedByStableUnion = await storage.resolveWechatUser({
        ...identity,
        openId: `${identity.openId}-another-app-session`,
      });
      assert.equal(resolvedByStableUnion.id, userId);
      const [identityCount] = await db
        .select({ value: count() })
        .from(schema.wechatIdentities)
        .where(eq(schema.wechatIdentities.userId, userId));
      assert.equal(Number(identityCount.value), 1);

      const handoffCode = `handoff-${suffix}`;
      await storage.createAuthHandoffCode(
        userId,
        handoffCode,
        new Date(Date.now() + 60_000),
      );
      assert.equal((await storage.consumeAuthHandoffCode(handoffCode))?.id, userId);
      assert.equal(await storage.consumeAuthHandoffCode(handoffCode), undefined);

      const expiredCode = `expired-${suffix}`;
      await storage.createAuthHandoffCode(
        userId,
        expiredCode,
        new Date(Date.now() - 1),
      );
      assert.equal(await storage.consumeAuthHandoffCode(expiredCode), undefined);

      const token = issueAuthToken(resolvedUsers[0], "test-session-secret");
      const payload = jwt.verify(token, "test-session-secret");
      assert.equal(typeof payload === "object" && payload.id, userId);
    } finally {
      if (userId) {
        await db.delete(schema.users).where(eq(schema.users.id, userId));
      }
    }
  },
);