/**
 * Phase 1B.3 — Refresh worker: queue → SerpApi tray → availability observations.
 */

import { fetchShoppingProducts } from "@/app/api/search/lib/fetchShopping";
import { logDevWarn } from "@/lib/log/devLog";
import type { QuantProduct } from "@/lib/shoppingScore";
import { supabaseAdminConfigured } from "@/lib/supabaseAdmin";
import type { AvailabilityObservationRow } from "@/lib/truth/availabilityObservation";
import {
  getLatestObservationsByListingUrls,
  insertAvailabilityObservation,
} from "@/lib/truth/availabilityObservation";
import { buildNormalizedAvailabilityObservation } from "@/lib/truth/listingRefreshAdapter";
import type { NormalizedAvailabilityObservation } from "@/lib/truth/listingRefreshAdapter";
import {
  groupRefreshJobsBySearchQuery,
  loadRefreshQueueTargets,
} from "@/lib/truth/refreshQueue";
import { scheduleRefreshJobs } from "@/lib/truth/refreshScheduler";
import {
  buildRefreshSearchQuery,
  readRefreshWorkerConfig,
  type RefreshJobResult,
  type RefreshJobTarget,
  type RefreshWorkerConfig,
  type RefreshWorkerRunReport,
} from "@/lib/truth/refreshJobTypes";

const OBSERVATION_SOURCE = "cron_refresh";

export type RefreshWorkerDeps = {
  loadTargets?: () => Promise<RefreshJobTarget[]>;
  fetchProducts?: (query: string) => Promise<QuantProduct[] | null>;
  getLatestObservations?: (urls: string[]) => Promise<Map<string, AvailabilityObservationRow>>;
  insertObservation?: typeof insertAvailabilityObservation;
  sleep?: (ms: number) => Promise<void>;
  now?: () => Date;
};

function defaultSleep(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function defaultFetchProducts(query: string): Promise<QuantProduct[] | null> {
  const result = await fetchShoppingProducts(query);
  if (!result.ok) {
    logDevWarn("refresh_worker.fetch", result.error);
    return null;
  }
  return result.products;
}

function pricesClose(a: number | null, b: number | null, tolerance = 0.005): boolean {
  if (a == null && b == null) return true;
  if (a == null || b == null || a <= 0 || b <= 0) return false;
  return Math.abs(a - b) / Math.max(a, b) <= tolerance;
}

/** Skip insert when latest observation already reflects the same market state. */
export function isDuplicateAvailabilityObservation(
  prior: AvailabilityObservationRow | null | undefined,
  next: NormalizedAvailabilityObservation
): boolean {
  if (!prior) return false;
  if (prior.availability !== next.availability) return false;
  if (!pricesClose(prior.current_price, next.current_price ?? null)) return false;
  if ((prior.availability_text ?? "") !== (next.availability_text ?? "")) return false;
  return true;
}

function toInsertPayload(observation: NormalizedAvailabilityObservation) {
  return {
    listing_url: observation.listing_url,
    sku_id: observation.sku_id,
    observed_at: observation.observed_at,
    availability: observation.availability,
    availability_text: observation.availability_text,
    current_price: observation.current_price,
    shipping_price: observation.shipping_price,
    source: observation.source,
    freshness_score: observation.freshness_score,
  };
}

async function fetchProductsWithRetry(
  query: string,
  config: RefreshWorkerConfig,
  fetchProducts: (query: string) => Promise<QuantProduct[] | null>,
  sleep: (ms: number) => Promise<void>
): Promise<{ products: QuantProduct[] | null; retries: number; error: string | null }> {
  let lastError: string | null = null;
  for (let attempt = 0; attempt <= config.maxRetries; attempt += 1) {
    try {
      const products = await fetchProducts(query);
      if (products !== null) {
        return { products, retries: attempt, error: null };
      }
      lastError = "empty_or_failed_fetch";
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
    }
    if (attempt < config.maxRetries) {
      await sleep(config.retryDelayMs * (attempt + 1));
    }
  }
  return { products: null, retries: config.maxRetries, error: lastError };
}

async function processRefreshJob(args: {
  job: RefreshJobTarget;
  products: QuantProduct[];
  prior: AvailabilityObservationRow | null;
  insertObservation: typeof insertAvailabilityObservation;
}): Promise<RefreshJobResult> {
  const normalized = buildNormalizedAvailabilityObservation({
    target: {
      listingUrl: args.job.listingUrl,
      title: args.job.title,
      store: args.job.store,
      skuId: args.job.skuId,
      searchQuery: args.job.searchQuery,
      referencePrice: args.job.referencePrice,
    },
    products: args.products,
    source: OBSERVATION_SOURCE,
    prior: args.prior
      ? {
          availability: args.prior.availability,
          current_price: args.prior.current_price,
          observed_at: args.prior.observed_at,
        }
      : null,
  });

  if (isDuplicateAvailabilityObservation(args.prior, normalized)) {
    return {
      jobId: args.job.jobId,
      listingUrl: args.job.listingUrl,
      status: "skipped",
      source: args.job.source,
      observationId: args.prior?.id ?? null,
      skippedReason: "duplicate_observation",
      error: null,
      retries: 0,
      searchQuery: buildRefreshSearchQuery(args.job),
    };
  }

  const inserted = await args.insertObservation(toInsertPayload(normalized));
  if (!inserted) {
    return {
      jobId: args.job.jobId,
      listingUrl: args.job.listingUrl,
      status: "failed",
      source: args.job.source,
      observationId: null,
      skippedReason: null,
      error: "observation_insert_failed",
      retries: 0,
      searchQuery: buildRefreshSearchQuery(args.job),
    };
  }

  return {
    jobId: args.job.jobId,
    listingUrl: args.job.listingUrl,
    status: "completed",
    source: args.job.source,
    observationId: inserted.id,
    skippedReason: null,
    error: null,
    retries: 0,
    searchQuery: buildRefreshSearchQuery(args.job),
  };
}

/** Execute one refresh worker run (safe to call from cron route). */
export async function runRefreshWorker(
  config: RefreshWorkerConfig = readRefreshWorkerConfig(),
  deps: RefreshWorkerDeps = {}
): Promise<RefreshWorkerRunReport> {
  const startedAt = (deps.now ?? (() => new Date()))().toISOString();
  const runId = `refresh_${Date.now()}`;
  const sleep = deps.sleep ?? defaultSleep;
  const loadTargets = deps.loadTargets ?? loadRefreshQueueTargets;
  const fetchProducts = deps.fetchProducts ?? defaultFetchProducts;
  const getLatestObservations = deps.getLatestObservations ?? getLatestObservationsByListingUrls;
  const insertObservation = deps.insertObservation ?? insertAvailabilityObservation;

  const emptyReport = (partial: Partial<RefreshWorkerRunReport>): RefreshWorkerRunReport => ({
    runId,
    startedAt,
    finishedAt: new Date().toISOString(),
    enabled: config.enabled,
    configured: supabaseAdminConfigured,
    scheduled: 0,
    completed: 0,
    skipped: 0,
    failed: 0,
    serpApiCalls: 0,
    results: [],
    ...partial,
  });

  if (!config.enabled) {
    return emptyReport({ enabled: false });
  }

  const usingDefaultPersistence = !deps.loadTargets && !deps.insertObservation;
  if (!supabaseAdminConfigured && usingDefaultPersistence) {
    return emptyReport({ configured: false });
  }

  const targets = await loadTargets();
  const jobs = scheduleRefreshJobs(targets, config, deps.now?.() ?? new Date());
  if (jobs.length === 0) {
    return emptyReport({ scheduled: 0 });
  }

  const results: RefreshJobResult[] = [];
  let serpApiCalls = 0;
  const groups = groupRefreshJobsBySearchQuery(jobs);
  const latestObservations = await getLatestObservations(jobs.map((job) => job.listingUrl));

  for (const [query, groupedJobs] of groups) {
    const fetchResult = await fetchProductsWithRetry(query, config, fetchProducts, sleep);
    serpApiCalls += 1;

    if (!fetchResult.products) {
      for (const job of groupedJobs) {
        results.push({
          jobId: job.jobId,
          listingUrl: job.listingUrl,
          status: "failed",
          source: job.source,
          observationId: null,
          skippedReason: null,
          error: fetchResult.error ?? "fetch_failed",
          retries: fetchResult.retries,
          searchQuery: query,
        });
      }
      if (config.serpApiDelayMs > 0) await sleep(config.serpApiDelayMs);
      continue;
    }

    for (const job of groupedJobs) {
      try {
        const prior = latestObservations.get(job.listingUrl) ?? null;
        const result = await processRefreshJob({
          job,
          products: fetchResult.products,
          prior,
          insertObservation,
        });
        results.push({ ...result, retries: fetchResult.retries });
      } catch (e) {
        results.push({
          jobId: job.jobId,
          listingUrl: job.listingUrl,
          status: "failed",
          source: job.source,
          observationId: null,
          skippedReason: null,
          error: e instanceof Error ? e.message : String(e),
          retries: fetchResult.retries,
          searchQuery: query,
        });
      }
    }

    if (config.serpApiDelayMs > 0) await sleep(config.serpApiDelayMs);
  }

  const completed = results.filter((r) => r.status === "completed").length;
  const skipped = results.filter((r) => r.status === "skipped").length;
  const failed = results.filter((r) => r.status === "failed").length;

  return {
    runId,
    startedAt,
    finishedAt: new Date().toISOString(),
    enabled: true,
    configured: true,
    scheduled: jobs.length,
    completed,
    skipped,
    failed,
    serpApiCalls,
    results,
  };
}
