/**
 * Guest/auth search abuse protection — env-tunable caps (no subscription changes).
 * SerpAPI cost is bounded by rate limits + existing pipeline cache.
 */

import {
  enforceLimit,
  guestSearchRatelimit,
  searchRatelimit,
  type RateLimitResult,
} from "@/lib/rate-limit";

export type SearchLimitCode = "GUEST_BURST" | "GUEST_DAILY" | "GUEST_HOURLY" | "AUTH_BURST" | "AUTH_HOURLY";

export type SearchLimitDenied = {
  ok: false;
  retryAfter: number;
  code: SearchLimitCode;
  message: string;
};

function envInt(name: string, fallback: number): number {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

export function guestSearchHourlyMax(): number {
  return envInt("GUEST_SEARCH_HOURLY_MAX", 12);
}

export function guestSearchDailyMax(): number {
  return envInt("GUEST_SEARCH_DAILY_MAX", 20);
}

export function guestSearchBurstPerMinute(): number {
  return envInt("GUEST_SEARCH_BURST_PER_MIN", 4);
}

export function authSearchBurstPerMinute(): number {
  return envInt("AUTH_SEARCH_BURST_PER_MIN", 18);
}

export const MAX_SEARCH_QUERY_LENGTH = envInt("SEARCH_QUERY_MAX_LENGTH", 220);

const guestBurstBuckets = new Map<string, { count: number; resetAt: number }>();
const guestDailyBuckets = new Map<string, { count: number; resetAt: number }>();
const authBurstBuckets = new Map<string, { count: number; resetAt: number }>();

function utcDayEndMs(): number {
  const d = new Date();
  d.setUTCHours(24, 0, 0, 0);
  return d.getTime();
}

function slidingWindowLimit(
  store: Map<string, { count: number; resetAt: number }>,
  key: string,
  max: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  let bucket = store.get(key);
  if (!bucket || now >= bucket.resetAt) {
    bucket = { count: 0, resetAt: now + windowMs };
    store.set(key, bucket);
  }
  bucket.count += 1;
  if (bucket.count <= max) return { ok: true };
  return {
    ok: false,
    retryAfter: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
  };
}

function dailyLimit(
  store: Map<string, { count: number; resetAt: number }>,
  key: string,
  max: number
): RateLimitResult {
  const now = Date.now();
  let bucket = store.get(key);
  if (!bucket || now >= bucket.resetAt) {
    bucket = { count: 0, resetAt: utcDayEndMs() };
    store.set(key, bucket);
  }
  bucket.count += 1;
  if (bucket.count <= max) return { ok: true };
  return {
    ok: false,
    retryAfter: Math.max(60, Math.ceil((bucket.resetAt - now) / 1000)),
  };
}

export function guestRateLimitMessage(code: SearchLimitCode, retryAfter: number): string {
  const wait = retryAfter > 0 ? ` Retry in ~${retryAfter}s.` : "";
  switch (code) {
    case "GUEST_BURST":
      return `Guest search throughput exceeded — pause before the next intelligence read.${wait} Sign in for a higher clearance window.`;
    case "GUEST_DAILY":
      return `Guest daily search allowance reached for this session.${wait} Sign in to continue with persistence and higher throughput.`;
    case "GUEST_HOURLY":
      return `Guest search window is cooling down.${wait} Sign in for expanded intelligence throughput.`;
    default:
      return `Search throughput limit reached.${wait}`;
  }
}

export function authBurstLimitMessage(retryAfter: number): string {
  const wait = retryAfter > 0 ? ` Retry in ~${retryAfter}s.` : "";
  return `Intelligence throughput burst limit reached.${wait} Wait briefly before the next read.`;
}

export function authHourlyLimitMessage(retryAfter: number): string {
  const wait = retryAfter > 0 ? ` Retry in ~${retryAfter}s.` : "";
  return `Hourly intelligence throughput limit reached.${wait}`;
}

/** Guest: burst/min → daily cap → hourly cap (Upstash or memory). */
export async function enforceGuestSearchLimits(guestId: string): Promise<SearchLimitDenied | { ok: true }> {
  const id = guestId.slice(0, 128) || "unknown";

  const burst = slidingWindowLimit(
    guestBurstBuckets,
    id,
    guestSearchBurstPerMinute(),
    60 * 1000
  );
  if (!burst.ok) {
    return {
      ok: false,
      retryAfter: burst.retryAfter,
      code: "GUEST_BURST",
      message: guestRateLimitMessage("GUEST_BURST", burst.retryAfter),
    };
  }

  const daily = dailyLimit(guestDailyBuckets, id, guestSearchDailyMax());
  if (!daily.ok) {
    return {
      ok: false,
      retryAfter: daily.retryAfter,
      code: "GUEST_DAILY",
      message: guestRateLimitMessage("GUEST_DAILY", daily.retryAfter),
    };
  }

  const hourly = await enforceLimit(guestSearchRatelimit, id, {
    memoryPrefix: "quantai:search:guest",
    memoryMax: guestSearchHourlyMax(),
  });
  if (!hourly.ok) {
    return {
      ok: false,
      retryAfter: hourly.retryAfter,
      code: "GUEST_HOURLY",
      message: guestRateLimitMessage("GUEST_HOURLY", hourly.retryAfter),
    };
  }

  return { ok: true };
}

export type AuthSearchLimitDenied = {
  ok: false;
  retryAfter: number;
  code: "AUTH_BURST" | "AUTH_HOURLY";
  message: string;
};

/** Authenticated abuse: short burst cap before hourly Upstash/memory limit. */
export async function enforceAuthSearchLimits(
  userId: string
): Promise<AuthSearchLimitDenied | { ok: true }> {
  const burst = slidingWindowLimit(
    authBurstBuckets,
    userId,
    authSearchBurstPerMinute(),
    60 * 1000
  );
  if (!burst.ok) {
    return {
      ok: false,
      retryAfter: burst.retryAfter,
      code: "AUTH_BURST",
      message: authBurstLimitMessage(burst.retryAfter),
    };
  }
  const hourly = await enforceLimit(searchRatelimit, userId, { memoryPrefix: "quantai:search" });
  if (!hourly.ok) {
    return {
      ok: false,
      retryAfter: hourly.retryAfter,
      code: "AUTH_HOURLY",
      message: authHourlyLimitMessage(hourly.retryAfter),
    };
  }
  return { ok: true };
}
