import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import {
  ApiRequestError,
  apiRequest,
} from "./queryClient";
import {
  DEFAULT_REGISTER_ERROR,
  RegisterSubmissionData,
  submitRegistration,
} from "./registerFlow";

const originalFetch = globalThis.fetch;
const originalLocalStorage = globalThis.localStorage;

const registrationData: RegisterSubmissionData = {
  name: "테스트 사용자",
  email: "test@example.com",
  password: "password",
};

function installLocalStorage() {
  const values = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
    clear: () => values.clear(),
    key: (index) => Array.from(values.keys())[index] ?? null,
    get length() {
      return values.size;
    },
  };
}

function makeResponse(body: string, status: number, statusText = "") {
  return new Response(body, {
    status,
    statusText,
    headers: { "Content-Type": "application/json" },
  });
}

async function runRegistrationWithApiFailure(
  fetchFailure: () => Promise<Response>,
) {
  installLocalStorage();
  globalThis.fetch = fetchFailure;

  const toasts: Array<Record<string, string>> = [];
  const locations: string[] = [];
  const result = await submitRegistration({
    data: registrationData,
    userType: "staff",
    registerUser: async (name, email, password, userType) => {
      await apiRequest("POST", "/api/auth/register", {
        name,
        email,
        password,
        userType,
      });
    },
    toast: (toast) => toasts.push(toast),
    setLocation: (location) => locations.push(location),
  });

  return { result, toasts, locations };
}

afterEach(() => {
  globalThis.fetch = originalFetch;
  globalThis.localStorage = originalLocalStorage;
});

test("structured API signup errors reach the failure toast", async () => {
  const { result, toasts, locations } = await runRegistrationWithApiFailure(
    async () =>
      makeResponse(
        JSON.stringify({ message: "이미 사용 중인 이메일입니다." }),
        409,
      ),
  );

  assert.equal(result, false);
  assert.deepEqual(toasts, [
    {
      title: "회원가입 실패",
      description: "이미 사용 중인 이메일입니다.",
      variant: "destructive",
    },
  ]);
  assert.deepEqual(locations, []);
});

test("non-JSON signup responses use the generic Korean error", async () => {
  const { result, toasts, locations } = await runRegistrationWithApiFailure(
    async () => makeResponse("Service unavailable", 503, "Unavailable"),
  );

  assert.equal(result, false);
  assert.equal(toasts[0]?.description, DEFAULT_REGISTER_ERROR);
  assert.deepEqual(locations, []);
});

test("network failures use the generic Korean error", async () => {
  const { result, toasts, locations } = await runRegistrationWithApiFailure(
    async () => {
      throw new TypeError("Failed to fetch");
    },
  );

  assert.equal(result, false);
  assert.equal(toasts[0]?.description, DEFAULT_REGISTER_ERROR);
  assert.deepEqual(locations, []);
});

test("successful registration still shows success and navigates", async () => {
  installLocalStorage();
  const calls: unknown[][] = [];
  const toasts: Array<Record<string, string>> = [];
  const locations: string[] = [];

  const result = await submitRegistration({
    data: registrationData,
    userType: "staff",
    registerUser: async (...args) => {
      calls.push(args);
    },
    toast: (toast) => toasts.push(toast),
    setLocation: (location) => locations.push(location),
  });

  assert.equal(result, true);
  assert.deepEqual(calls, [
    ["테스트 사용자", "test@example.com", "password", "staff", undefined, undefined],
  ]);
  assert.deepEqual(toasts, [
    {
      title: "회원가입 성공",
      description: "환영합니다! 계정이 생성되었습니다.",
    },
  ]);
  assert.deepEqual(locations, ["/dashboard"]);
});

test("company registration forwards company information", async () => {
  installLocalStorage();
  const calls: unknown[][] = [];

  const result = await submitRegistration({
    data: {
      ...registrationData,
      weixin: "company-weixin",
      companyName: "테스트 회사",
      business: "무역",
      contactEmail: "contact@example.com",
      contactPhone: "010-1234-5678",
    },
    userType: "company",
    registerUser: async (...args) => {
      calls.push(args);
    },
    toast: () => undefined,
    setLocation: () => undefined,
  });

  assert.equal(result, true);
  assert.deepEqual(calls, [
    [
      "테스트 사용자",
      "test@example.com",
      "password",
      "company",
      {
        companyName: "테스트 회사",
        business: "무역",
        contactEmail: "contact@example.com",
        contactPhone: "010-1234-5678",
      },
      "company-weixin",
    ],
  ]);
});

async function runInvalidCompanyRegistration(
  data: RegisterSubmissionData,
) {
  const calls: unknown[][] = [];
  const fieldErrors: Record<string, string> = {};

  const result = await submitRegistration({
    data,
    userType: "company",
    registerUser: async (...args) => {
      calls.push(args);
    },
    toast: () => undefined,
    setLocation: () => undefined,
    setFieldError: (field, message) => {
      fieldErrors[field] = message;
    },
  });

  return { result, calls, fieldErrors };
}

test("company registration rejects a missing company name before calling registerUser", async () => {
  const { result, calls, fieldErrors } = await runInvalidCompanyRegistration({
    ...registrationData,
    business: "무역",
  });

  assert.equal(result, false);
  assert.deepEqual(calls, []);
  assert.deepEqual(fieldErrors, {
    companyName: "회사명은 2자 이상이어야 합니다",
  });
});

test("company registration rejects a too-short company name before calling registerUser", async () => {
  const { result, calls, fieldErrors } = await runInvalidCompanyRegistration({
    ...registrationData,
    companyName: "회",
    business: "무역",
  });

  assert.equal(result, false);
  assert.deepEqual(calls, []);
  assert.deepEqual(fieldErrors, {
    companyName: "회사명은 2자 이상이어야 합니다",
  });
});

test("company registration rejects missing business information before calling registerUser", async () => {
  const { result, calls, fieldErrors } = await runInvalidCompanyRegistration({
    ...registrationData,
    companyName: "테스트 회사",
  });

  assert.equal(result, false);
  assert.deepEqual(calls, []);
  assert.deepEqual(fieldErrors, {
    business: "사업 내용을 입력해주세요",
  });
});

test("company registration rejects too-short business information before calling registerUser", async () => {
  const { result, calls, fieldErrors } = await runInvalidCompanyRegistration({
    ...registrationData,
    companyName: "테스트 회사",
    business: "무",
  });

  assert.equal(result, false);
  assert.deepEqual(calls, []);
  assert.deepEqual(fieldErrors, {
    business: "사업 내용을 입력해주세요",
  });
});

test("API errors preserve their structured body", async () => {
  installLocalStorage();
  globalThis.fetch = async () =>
    makeResponse(JSON.stringify({ message: "입력값을 확인해주세요." }), 400);

  await assert.rejects(
    apiRequest("POST", "/api/auth/register", registrationData),
    (error: unknown) => {
      assert.ok(error instanceof ApiRequestError);
      assert.deepEqual(error.responseBody, {
        message: "입력값을 확인해주세요.",
      });
      return true;
    },
  );
});