import type { ZodSchema } from "zod";
import { ApiError } from "./errors";

export function parseOrThrow<T>(schema: ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new ApiError(
      400,
      "validation_error",
      "Please check your input and try again.",
      result.error.flatten()
    );
  }
  return result.data;
}
