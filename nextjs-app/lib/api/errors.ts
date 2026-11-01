export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, code: string, message?: string, details?: unknown) {
    super(message ?? code);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function retryAfterHeader(err: ApiError): HeadersInit | undefined {
  if (
    err.code === "rate_limited" &&
    err.details &&
    typeof err.details === "object" &&
    "retry_after_seconds" in err.details
  ) {
    const seconds = (err.details as { retry_after_seconds: unknown }).retry_after_seconds;
    if (typeof seconds === "number") {
      return { "Retry-After": String(seconds) };
    }
  }
  return undefined;
}

export function toResponse(err: unknown): Response {
  if (err instanceof ApiError) {
    return Response.json(
      { error: err.code, message: err.message, details: err.details },
      { status: err.status, headers: retryAfterHeader(err) }
    );
  }
  console.error(err);
  return Response.json(
    { error: "internal_error", message: "Something went wrong. Please try again." },
    { status: 500 }
  );
}
