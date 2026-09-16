import assert from "node:assert/strict";
import test from "node:test";
import { csrfProtection } from "./routes";

function createRequest(path: string, cookie: string) {
  return {
    method: "POST",
    path,
    protocol: "http",
    headers: {
      cookie,
      origin: "http://kscc.kr",
      host: "kscc.kr",
    },
    get(name: string) {
      return this.headers[name.toLowerCase() as keyof typeof this.headers];
    },
  } as any;
}

function createForwardedRequest(path: string, cookie: string) {
  return {
    method: "POST",
    path,
    protocol: "http",
    headers: {
      cookie,
      origin: "https://preview.example",
      host: "127.0.0.1:5000",
      "x-forwarded-proto": "https",
      "x-forwarded-host": "preview.example",
    },
    get(name: string) {
      return this.headers[name.toLowerCase() as keyof typeof this.headers];
    },
  } as any;
}

function createResponse() {
  const response = {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) {
      response.statusCode = code;
      return response;
    },
    json(body: unknown) {
      response.body = body;
      return response;
    },
  };
  return response;
}

test("stale auth cookies do not block same-origin login", () => {
  const request = createRequest(
    "/api/auth/login",
    "auth_session=expired-token",
  );
  const response = createResponse();
  let called = false;

  csrfProtection(request, response as any, () => {
    called = true;
  });

  assert.equal(called, true);
  assert.equal(response.statusCode, 200);
});

test("authenticated state-changing requests still require the CSRF token", () => {
  const request = createRequest(
    "/api/auth/profile",
    "auth_session=active-token",
  );
  const response = createResponse();
  let called = false;

  csrfProtection(request, response as any, () => {
    called = true;
  });

  assert.equal(called, false);
  assert.equal(response.statusCode, 403);
  assert.deepEqual(response.body, { message: "CSRF validation failed" });
});

test("same-origin checks use the public host behind a preview proxy", () => {
  const request = createForwardedRequest(
    "/api/auth/profile",
    "auth_session=active-token",
  );
  const response = createResponse();
  let called = false;

  csrfProtection(request, response as any, () => {
    called = true;
  });

  assert.equal(called, false);
  assert.equal(response.statusCode, 403);
  assert.deepEqual(response.body, { message: "CSRF validation failed" });
});