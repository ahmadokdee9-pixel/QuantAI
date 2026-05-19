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

/** In-memory fallback when Redis is absent — protects production from unlimited abuse. */
const memoryBuckets = new Map<string, { count: number; resetAt: number }>();

const MEMORY_LIMITS: Record<string, { max: number; windowMs: number }> = {
  "quantai:search": { max: 45, windowMs: 60 * 60 * 1000 },
  "quantai:search:guest": { max: 25, windowMs: 60 * 60 * 1000 },
  "quantai:ai-chat": { max: 35, windowMs: 60 * 60 * 1000 },
  "quantai:compare-verdict": { max: 25, windowMs: 60 * 60 * 1000 },
  "quantai:copilot": { max: 40, windowMs: 60 * 60 * 1000 },
};

function memoryLimit(prefix: string, identifier: string): { ok: true } | { ok: false; retryAfter: number } {
  const cfg = MEMORY_LIMITS[prefix];
  if (!cfg) return { ok: true };
  const key = `${prefix}:${identifier}`;
  const now = Date.now();
  let bucket = memoryBuckets.get(key);
  if (!bucket || now >= bucket.resetAt) {
    bucket = { count: 0, resetAt: now + cfg.windowMs };
    memoryBuckets.set(key, bucket);
  }
  bucket.count += 1;
  if (bucket.count <= cfg.max) return { ok: true };
  return {
    ok: false,
    retryAfter: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
  };
}

export function rateLimitBackend(): "upstash" | "memory" {
  return redis ? "upstash" : "memory";
}

export async function enforceLimit(
  limiter: Ratelimit | null,
  identifier: string,
  opts?: { memoryPrefix?: string }
): Promise<{ ok: true } | { ok: false; retryAfter: number }> {
  if (limiter) {
    const { success, reset } = await limiter.limit(identifier);
    if (success) return { ok: true };
    const retryAfter = Math.max(0, Math.ceil((reset - Date.now()) / 1000));
    return { ok: false, retryAfter };
  }
  const prefix = opts?.memoryPrefix ?? "quantai:search";
  return memoryLimit(prefix, identifier);
}
