/**
 * Phase 1B.3 — Refresh worker job types and configuration.
 */

import type { AvailabilityObservationSnapshot } from "@/lib/truth/availabilityChangeDetector";

export const REFRESH_JOB_SOURCES = ["watchlist", "saved"] as const;

export type RefreshJobSource = (typeof REFRESH_JOB_SOURCES)[number];

export type RefreshJobStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "skipped";

export type RefreshJobTarget = {
  jobId: string;
  listingUrl: string;
  title: string;
  store: string;
  skuId: string | null;
  searchQuery: string | null;
  referencePrice: number | null;
  source: RefreshJobSource;
  priority: number;
  lastObservedAt: string | null;
  freshnessScore: number | null;
  ageHours: number | null;
};

export type RefreshJobResult = {
  jobId: string;
  listingUrl: string;
  status: RefreshJobStatus;
  source: RefreshJobSource;
  observationId: string | null;
  skippedReason: string | null;
  error: string | null;
  retries: number;
  searchQuery: string | null;
};

export type RefreshWorkerRunReport = {
  runId: string;
  startedAt: string;
  finishedAt: string;
  enabled: boolean;
  configured: boolean;
  scheduled: number;
  completed: number;
  skipped: number;
  failed: number;
  serpApiCalls: number;
  results: RefreshJobResult[];
};

export type RefreshWorkerConfig = {
  enabled: boolean;
  batchSize: number;
  staleHours: number;
  minRefreshIntervalHours: number;
  maxRetries: number;
  retryDelayMs: number;
  serpApiDelayMs: number;
  sourcePriorities: Record<RefreshJobSource, number>;
};

export type RefreshCandidate = {
  listingUrl: string;
  title: string;
  store: string;
  skuId: string | null;
  searchQuery: string | null;
  referencePrice: number | null;
  source: RefreshJobSource;
  lastCheckedAt: string | null;
};

export type RefreshObservationMeta = {
  listingUrl: string;
  lastObservedAt: string;
  freshnessScore: number;
  ageHours: number;
  snapshot: AvailabilityObservationSnapshot;
};

const DEFAULT_SOURCE_PRIORITIES: Record<RefreshJobSource, number> = {
  watchlist: 100,
  saved: 90,
};

function readIntEnv(
  env: NodeJS.ProcessEnv,
  name: string,
  fallback: number,
  min: number,
  max: number
): number {
  const raw = Number(env[name]);
  if (!Number.isFinite(raw)) return fallback;
  return Math.min(max, Math.max(min, Math.round(raw)));
}

/** Load refresh worker configuration from environment. */
export function readRefreshWorkerConfig(
  env: NodeJS.ProcessEnv = process.env
): RefreshWorkerConfig {
  return {
    enabled: (env.REFRESH_ENABLED ?? "true").trim().toLowerCase() !== "false",
    batchSize: readIntEnv(env, "REFRESH_BATCH_SIZE", 40, 1, 120),
    staleHours: readIntEnv(env, "REFRESH_STALE_HOURS", 24, 1, 168),
    minRefreshIntervalHours: readIntEnv(env, "REFRESH_MIN_INTERVAL_HOURS", 24, 1, 168),
    maxRetries: readIntEnv(env, "REFRESH_MAX_RETRIES", 2, 0, 5),
    retryDelayMs: readIntEnv(env, "REFRESH_RETRY_DELAY_MS", 800, 100, 10_000),
    serpApiDelayMs: readIntEnv(env, "REFRESH_SERPAPI_DELAY_MS", 400, 0, 5_000),
    sourcePriorities: {
      watchlist: readIntEnv(env, "REFRESH_SOURCE_PRIORITY_WATCHLIST", DEFAULT_SOURCE_PRIORITIES.watchlist, 0, 200),
      saved: readIntEnv(env, "REFRESH_SOURCE_PRIORITY_SAVED", DEFAULT_SOURCE_PRIORITIES.saved, 0, 200),
    },
  };
}

export function buildRefreshSearchQuery(target: Pick<RefreshJobTarget, "title" | "store" | "searchQuery">): string {
  const explicit = target.searchQuery?.trim();
  if (explicit) return explicit.slice(0, 120);
  const title = target.title.trim().slice(0, 80);
  const store = target.store.trim();
  if (title && store && store.toLowerCase() !== "unknown store") {
    return `"${title}" ${store}`.slice(0, 120);
  }
  return title.slice(0, 120);
}
