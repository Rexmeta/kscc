import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { getCsrfHeaders, removeAuthToken } from "./auth";

export class ApiRequestError extends Error {
  constructor(
    public readonly status: number,
    public readonly responseBody: unknown,
    responseText: string,
  ) {
    super(`${status}: ${responseText}`);
    this.name = "ApiRequestError";
  }
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    let responseBody: unknown;

    try {
      responseBody = JSON.parse(text);
    } catch {
      responseBody = undefined;
    }

    throw new ApiRequestError(res.status, responseBody, text);
  }
}

export async function fetchJson<T>(url: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (["POST", "PUT", "PATCH", "DELETE"].includes((init.method || "GET").toUpperCase())) {
    Object.entries(getCsrfHeaders()).forEach(([name, value]) => headers.set(name, value));
  }
  const res = await fetch(url, {
    ...init,
    cache: "no-store",
    headers,
    credentials: "include",
  });
  await throwIfResNotOk(res);
  return res.json() as Promise<T>;
}
export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const headers: Record<string, string> = {
    ...((["POST", "PUT", "PATCH", "DELETE"].includes(method.toUpperCase()))
      ? getCsrfHeaders()
      : {}),
  };
  
  if (data) {
    headers["Content-Type"] = "application/json";
  }
  
  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    cache: "no-store",
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey, signal }) => {
    const url = typeof queryKey[0] === "string" ? queryKey[0] : String(queryKey[0]);
    const res = await fetch(url, {
      cache: "no-store",
      credentials: "include",
      signal,
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      removeAuthToken();
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryKeys = {
  posts: {
    list: (params: Record<string, unknown> = {}) =>
      ["/api/posts", "list", params] as const,
    detail: (id: string, locale?: string) =>
      ["/api/posts", "detail", id, locale ?? null] as const,
    home: (locale?: string) =>
      ["/api/posts/slug", "home", locale ?? null] as const,
  },
  members: {
    list: (params: Record<string, unknown> = {}) =>
      ["/api/members", "list", params] as const,
  },
  memberService: {
    bootstrap: () => ["/api/member-service/v1/bootstrap"] as const,
    directory: (params: Record<string, unknown> = {}) =>
      ["/api/member-service/v1/directory", "list", params] as const,
    organization: (id: string, language?: string) =>
      ["/api/member-service/v1/directory", id, language ?? null] as const,
    reviewQueue: (page = 1, limit = 25) =>
      ["/api/member-service/v1/operator/review-queue", page, limit] as const,
    reviewAudits: (page = 1, limit = 25) =>
      ["/api/member-service/v1/operator/review-audits", page, limit] as const,
    organizationReview: (id: string) =>
      ["/api/member-service/v1/operator/organizations", id, "review"] as const,
  },
  partners: {
    list: (params: Record<string, unknown> = {}) =>
      ["/api/partners", "public", params] as const,
    adminList: () => ["/api/partners", "admin"] as const,
  },
} as const;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
