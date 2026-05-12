import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

function redisClient(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

const redis = redisClient();

/** Shopping search: per authenticated user, sliding window (only when Upstash is configured). */
export const searchRatelimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(60, "1 h"),
      prefix: "quantai:search",
    })
  : null;

/** AI chat: stricter cap per user. */
export const aiChatRatelimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(40, "1 h"),
      prefix: "quantai:ai-chat",
    })
  : null;

export const compareVerdictRatelimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(30, "1 h"),
      prefix: "quantai:compare-verdict",
    })
  : null;

/** Copilot chat — per user or guest IP when Redis configured. */
export const copilotRatelimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(50, "1 h"),
      prefix: "quantai:copilot",
    })
  : null;

export async function enforceLimit(
  limiter: Ratelimit | null,
  identifier: string
): Promise<{ ok: true } | { ok: false; retryAfter: number }> {
  if (!limiter) return { ok: true };
  const { success, reset } = await limiter.limit(identifier);
  if (success) return { ok: true };
  const retryAfter = Math.max(0, Math.ceil((reset - Date.now()) / 1000));
  return { ok: false, retryAfter };
}
