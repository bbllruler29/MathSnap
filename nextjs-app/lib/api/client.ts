export class ClientApiError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

interface ApiErrorBody {
  error: string;
  message: string;
  details?: unknown;
}

interface RequestOptions {
  // Set for pre-session endpoints (login/signup) where a 401 means "these
  // credentials are wrong," not "your session expired" — the global
  // redirect-to-login behavior below only makes sense for the latter.
  skipAuthRedirect?: boolean;
}

async function request<T>(
  path: string,
  init?: RequestInit,
  options?: RequestOptions
): Promise<T> {
  const isFormData = init?.body instanceof FormData;

  const response = await fetch(path, {
    ...init,
    credentials: "include",
    headers: {
      ...(init?.body && !isFormData ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });

  if (response.status === 401 && !options?.skipAuthRedirect) {
    if (typeof window !== "undefined") {
      const redirect = encodeURIComponent(window.location.pathname);
      window.location.href = `/login?redirect=${redirect}`;
    }
    throw new ClientApiError(401, "unauthenticated", "Please sign in to continue.");
  }

  if (!response.ok) {
    let body: ApiErrorBody;
    try {
      body = await response.json();
    } catch {
      body = { error: "unknown_error", message: "Something went wrong. Please try again." };
    }
    throw new ClientApiError(response.status, body.error, body.message, body.details);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(
      path,
      {
        method: "POST",
        body:
          body instanceof FormData
            ? body
            : body !== undefined
              ? JSON.stringify(body)
              : undefined,
      },
      options
    ),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
};
