import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export interface RateLimitResult {
  success: boolean;
  reset: number;
}

interface Limiter {
  limit(identifier: string): Promise<RateLimitResult>;
}

/**
 * Upstash is optional in local dev (no card/signup required to run the app).
 * When the env vars are absent, every limiter becomes a permissive no-op so
 * local development isn't blocked — in any environment where the vars are
 * set, real sliding-window limiting is enforced.
 */
function createLimiter(maxRequests: number, window: `${number} m`): Limiter {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return {
      async limit() {
        return { success: true, reset: Date.now() };
      },
    };
  }

  const redis = new Redis({ url, token });
  const ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(maxRequests, window),
  });

  return {
    async limit(identifier: string) {
      const result = await ratelimit.limit(identifier);
      return { success: result.success, reset: result.reset };
    },
  };
}

export const solveRateLimit = createLimiter(10, "1 m");
export const messageRateLimit = createLimiter(20, "1 m");
export const ipRateLimit = createLimiter(30, "1 m");
export const authRateLimit = createLimiter(10, "1 m");

export function retryAfterSeconds(reset: number): number {
  return Math.max(1, Math.ceil((reset - Date.now()) / 1000));
}
