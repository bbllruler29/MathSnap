/**
 * Centralized size/length/usage limits. Values are read from env where the
 * engineering doc defines a tunable env var, with the documented defaults as
 * fallback — one source of truth instead of magic numbers scattered across
 * Zod schemas, route handlers, and the AI pipeline.
 */

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10MB — matches the storage bucket / upload spec
export const MAX_MESSAGE_LENGTH = 2000;
export const MAX_FLAG_REASON_LENGTH = 500;
export const MAX_CHAT_HISTORY = Number(process.env.MAX_CHAT_HISTORY ?? 20);
export const DAILY_FREE_SOLVE_LIMIT = Number(process.env.DAILY_FREE_SOLVE_LIMIT ?? 5);
export const SOLVE_CONFIDENCE_THRESHOLD = Number(process.env.SOLVE_CONFIDENCE_THRESHOLD ?? 0.75);
