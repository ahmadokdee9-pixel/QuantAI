/**
 * Shared Upstash Redis client — same credentials as rate-limit.
 * Returns null when unset (callers must fail soft).
 */
import { Redis } from "@upstash/redis";

let cached: Redis | null | undefined;

export function hasUpstashRedisEnv(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(env.UPSTASH_REDIS_REST_URL?.trim() && env.UPSTASH_REDIS_REST_TOKEN?.trim());
}

export function getUpstashRedis(env: NodeJS.ProcessEnv = process.env): Redis | null {
  if (cached !== undefined) return cached;
  const url = env.UPSTASH_REDIS_REST_URL?.trim();
  const token = env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) {
    cached = null;
    return null;
  }
  cached = new Redis({ url, token });
  return cached;
}

/** Test helper — force new client (simulates independent worker). */
export function createUpstashRedisClient(env: NodeJS.ProcessEnv = process.env): Redis | null {
  const url = env.UPSTASH_REDIS_REST_URL?.trim();
  const token = env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) return null;
  return new Redis({ url, token });
}

export function resetUpstashRedisClientCache(): void {
  cached = undefined;
}
