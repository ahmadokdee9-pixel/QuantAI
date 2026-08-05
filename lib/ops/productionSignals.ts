/**
 * Production ops signals — empty search, errors, upstream cost proxies.
 * Structured logs always; shared Upstash counters when configured (on-call within minutes).
 */

import { Redis } from "@upstash/redis";

export type OpsSignalKind =
  | "search_ok"
  | "search_empty"
  | "api_5xx"
  | "upstream_cost"
  | "rate_limit";

function opsRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) return null;
  return new Redis({ url, token });
}

function hourBucket(): string {
  return new Date().toISOString().slice(0, 13); // YYYY-MM-DDTHH
}

function counterKey(kind: OpsSignalKind, hour = hourBucket()): string {
  return `quantai:ops:${hour}:${kind}`;
}

function emitOpsLog(kind: OpsSignalKind, fields?: Record<string, unknown>) {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level: kind === "api_5xx" ? "error" : kind === "search_empty" || kind === "rate_limit" ? "warn" : "info",
    event: "ops.signal",
    quantai_ops: true,
    kind,
    ...(fields ?? {}),
  });
  if (kind === "api_5xx") console.error(line);
  else if (kind === "search_empty" || kind === "rate_limit") console.warn(line);
  else console.info(line);
}

/** Fire-and-forget signal: Vercel logs + shared counters. */
export function recordOpsSignal(
  kind: OpsSignalKind,
  fields?: Record<string, unknown>
): void {
  emitOpsLog(kind, fields);

  const redis = opsRedis();
  if (!redis) return;
  const key = counterKey(kind);
  const delta =
    kind === "upstream_cost" && typeof fields?.units === "number" && fields.units > 0
      ? Math.floor(fields.units)
      : 1;
  void redis
    .incrby(key, delta)
    .then(() => redis.expire(key, 60 * 60 * 48))
    .catch(() => {
      /* never break request path */
    });
}

export type OpsHourSnapshot = {
  hour: string;
  search_ok: number;
  search_empty: number;
  api_5xx: number;
  upstream_cost: number;
  rate_limit: number;
  emptySearchRatePct: number | null;
};

async function readCount(redis: Redis, kind: OpsSignalKind, hour: string): Promise<number> {
  try {
    const v = await redis.get<number | string>(counterKey(kind, hour));
    const n = typeof v === "number" ? v : Number(v ?? 0);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

/** Current UTC hour counters from shared store (null if Upstash missing). */
export async function readOpsHourSnapshot(): Promise<OpsHourSnapshot | null> {
  const redis = opsRedis();
  if (!redis) return null;
  const hour = hourBucket();
  const [search_ok, search_empty, api_5xx, upstream_cost, rate_limit] = await Promise.all([
    readCount(redis, "search_ok", hour),
    readCount(redis, "search_empty", hour),
    readCount(redis, "api_5xx", hour),
    readCount(redis, "upstream_cost", hour),
    readCount(redis, "rate_limit", hour),
  ]);
  const denom = search_ok + search_empty;
  return {
    hour,
    search_ok,
    search_empty,
    api_5xx,
    upstream_cost,
    rate_limit,
    emptySearchRatePct: denom > 0 ? Number(((search_empty / denom) * 100).toFixed(2)) : null,
  };
}
