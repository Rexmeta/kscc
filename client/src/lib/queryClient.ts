import { QueryClient, QueryFunction } from "@tanstack/react-query";

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

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const token = localStorage.getItem("token");
  const headers: Record<string, string> = {};
  
  if (data) {
    headers["Content-Type"] = "application/json";
  }
  
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
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
    const token = localStorage.getItem("token");
    const headers: Record<string, string> = {};
    
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const url = typeof queryKey[0] === "string" ? queryKey[0] : String(queryKey[0]);
    const res = await fetch(url, {
      headers,
      credentials: "include",
      signal,
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
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
  },
  members: {
    list: (params: Record<string, unknown> = {}) =>
      ["/api/members", "list", params] as const,
  },
  partners: {
    list: () => ["/api/partners", "public"] as const,
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
