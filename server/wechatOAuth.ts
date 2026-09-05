import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const WECHAT_STATE_COOKIE = "wechat_oauth_state";
export const WECHAT_CLIENT_CALLBACK_PATH = "/auth/wechat/callback";
export const WECHAT_PROVIDER = "wechat";
export const WECHAT_STATE_TTL_MS = 10 * 60 * 1000;
export const WECHAT_HANDOFF_TTL_MS = 2 * 60 * 1000;
const PROVIDER_TIMEOUT_MS = 5_000;

export interface WechatConfig {
  appId: string;
  appSecret: string;
  redirectUri: string;
}

export interface WechatVerifiedIdentity {
  openId: string;
  unionId?: string;
}

function isSafeRedirectUri(value: string): boolean {
  try {
    const uri = new URL(value);
    const isLocalDevelopment =
      uri.protocol === "http:" &&
      (uri.hostname === "localhost" || uri.hostname === "127.0.0.1");
    if (uri.protocol !== "https:" && !isLocalDevelopment) return false;
    return uri.username === "" &&
      uri.password === "" &&
      uri.hash === "" &&
      uri.search === "" &&
      uri.pathname === "/api/auth/wechat/callback";
  } catch {
    return false;
  }
}

export function getWechatConfig(): WechatConfig | undefined {
  const appId = process.env.WECHAT_APP_ID?.trim();
  const appSecret = process.env.WECHAT_APP_SECRET?.trim();
  const redirectUri = process.env.WECHAT_REDIRECT_URI?.trim();
  if (!appId || !appSecret || !redirectUri || !isSafeRedirectUri(redirectUri)) {
    return undefined;
  }
  return { appId, appSecret, redirectUri };
}

export function createSignedState(secret: string, now = Date.now()): string {
  const nonce = randomBytes(32).toString("base64url");
  const payload = `${nonce}.${now}`;
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function verifySignedState(
  state: string,
  expectedState: string | undefined,
  secret: string,
  now = Date.now(),
): boolean {
  if (state.length > 512) return false;
  if (!expectedState || state !== expectedState) return false;
  const parts = state.split(".");
  if (parts.length !== 3) return false;
  const [nonce, timestampText, signature] = parts;
  if (!nonce || !signature || !/^\d+$/.test(timestampText)) return false;
  const timestamp = Number(timestampText);
  if (!Number.isSafeInteger(timestamp) || Math.abs(now - timestamp) > WECHAT_STATE_TTL_MS) {
    return false;
  }
  const expectedSignature = createHmac("sha256", secret)
    .update(`${nonce}.${timestampText}`)
    .digest("base64url");
  const actual = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function getCookieValue(cookieHeader: string | undefined, name: string): string | undefined {
  if (!cookieHeader) return undefined;
  for (const part of cookieHeader.split(";")) {
    const separator = part.indexOf("=");
    if (separator === -1) continue;
    const key = part.slice(0, separator).trim();
    if (key !== name) continue;
    try {
      return decodeURIComponent(part.slice(separator + 1).trim());
    } catch {
      return undefined;
    }
  }
  return undefined;
}

export function getWechatAuthorizeUrl(config: WechatConfig, state: string): string {
  const params = new URLSearchParams({
    appid: config.appId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: "snsapi_login",
    state,
  });
  return `https://open.weixin.qq.com/connect/qrconnect?${params.toString()}#wechat_redirect`;
}

export function clearStateCookieHeader(): string {
  return `${WECHAT_STATE_COOKIE}=; Max-Age=0; Path=/api/auth/wechat; HttpOnly; SameSite=Lax`;
}

export function stateCookieHeader(state: string): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${WECHAT_STATE_COOKIE}=${encodeURIComponent(state)}; Max-Age=${Math.floor(WECHAT_STATE_TTL_MS / 1000)}; Path=/api/auth/wechat; HttpOnly; SameSite=Lax${secure}`;
}

export function getClientCallbackLocation(params: Record<string, string>): string {
  const query = new URLSearchParams(params);
  return `${WECHAT_CLIENT_CALLBACK_PATH}?${query.toString()}`;
}

async function readProviderJson(response: Response): Promise<Record<string, unknown>> {
  if (!response.ok) throw new Error("provider_http_error");
  const payload: unknown = await response.json();
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("provider_invalid_response");
  }
  return payload as Record<string, unknown>;
}

export async function exchangeWechatCode(
  config: WechatConfig,
  authorizationCode: string,
): Promise<WechatVerifiedIdentity> {
  const url = new URL("https://api.weixin.qq.com/sns/oauth2/access_token");
  url.search = new URLSearchParams({
    appid: config.appId,
    secret: config.appSecret,
    code: authorizationCode,
    grant_type: "authorization_code",
  }).toString();

  const response = await fetch(url, {
    signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
  });
  const payload = await readProviderJson(response);
  if (payload.errcode !== undefined && payload.errcode !== 0) {
    throw new Error("provider_rejected_code");
  }

  const openId = typeof payload.openid === "string" ? payload.openid.trim() : "";
  const unionId = typeof payload.unionid === "string" ? payload.unionid.trim() : "";
  if (!openId || openId.length > 256 || (unionId && unionId.length > 256)) {
    throw new Error("provider_missing_identity");
  }
  return { openId, ...(unionId ? { unionId } : {}) };
}