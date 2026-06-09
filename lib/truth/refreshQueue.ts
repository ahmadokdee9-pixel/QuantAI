/**
 * Phase 1B.3 — Build refresh queue from tracked listings + observation metadata.
 */

import { logDevWarn } from "@/lib/log/devLog";
import { isBenignStorageSchemaError } from "@/lib/supabase/benignStorageError";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  getLatestObservationsByListingUrls,
  type AvailabilityObservationRow,
} from "@/lib/truth/availabilityObservation";
import { computeObservationAgeHours } from "@/lib/truth/freshnessScore";
import { normalizeListingUrlForMatch } from "@/lib/truth/listingRefreshAdapter";
import type {
  RefreshCandidate,
  RefreshJobSource,
  RefreshJobTarget,
  RefreshObservationMeta,
} from "@/lib/truth/refreshJobTypes";
import { buildRefreshSearchQuery } from "@/lib/truth/refreshJobTypes";

function storeFromLink(link: string): string {
  try {
    const host = new URL(link).hostname.replace(/^www\./i, "");
    const label = host.split(".")[0];
    return label ? label.charAt(0).toUpperCase() + label.slice(1) : "Unknown store";
  } catch {
    return "Unknown store";
  }
}

function numberFromUnknown(value: unknown): number | null {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function candidateKey(listingUrl: string): string {
  return normalizeListingUrlForMatch(listingUrl);
}

function toObservationMeta(row: AvailabilityObservationRow): RefreshObservationMeta {
  const ageHours = computeObservationAgeHours(row.observed_at);
  return {
    listingUrl: row.listing_url,
    lastObservedAt: row.observed_at,
    freshnessScore: row.freshness_score,
    ageHours,
    snapshot: {
      availability: row.availability,
      current_price: row.current_price,
      observed_at: row.observed_at,
    },
  };
}

/** Load watchlist rows as refresh candidates (service role, all users). */
export async function loadWatchlistRefreshCandidates(): Promise<RefreshCandidate[]> {
  const db = supabaseAdmin;
  if (!db) return [];

  try {
    const { data, error } = await db
      .from("shopping_watchlist")
      .select("product, last_checked_at, created_at")
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) {
      if (!isBenignStorageSchemaError(error.message)) logDevWarn("refresh_queue.watchlist", error.message);
      return [];
    }

    const out: RefreshCandidate[] = [];
    for (const row of data ?? []) {
      const product =
        row.product && typeof row.product === "object" ? (row.product as Record<string, unknown>) : null;
      const link = readString(product?.link);
      const title = readString(product?.title);
      if (!link || !title) continue;
      out.push({
        listingUrl: link,
        title,
        store: readString(product?.store) ?? storeFromLink(link),
        skuId: null,
        searchQuery: null,
        referencePrice: numberFromUnknown(product?.price),
        source: "watchlist",
        lastCheckedAt:
          readString(row.last_checked_at) ?? readString(row.created_at),
      });
    }
    return out;
  } catch (e) {
    if (!isBenignStorageSchemaError(String(e))) logDevWarn("refresh_queue.watchlist", String(e));
    return [];
  }
}

/** Load saved products as refresh candidates (service role, all users). */
export async function loadSavedProductRefreshCandidates(): Promise<RefreshCandidate[]> {
  const db = supabaseAdmin;
  if (!db) return [];

  try {
    const { data, error } = await db
      .from("saved_products")
      .select("title, price, link, created_at, updated_at")
      .order("updated_at", { ascending: false })
      .limit(500);

    if (error) {
      if (!isBenignStorageSchemaError(error.message)) logDevWarn("refresh_queue.saved", error.message);
      return [];
    }

    const out: RefreshCandidate[] = [];
    for (const row of data ?? []) {
      const link = readString(row.link);
      const title = readString(row.title);
      if (!link || !title) continue;
      out.push({
        listingUrl: link,
        title,
        store: storeFromLink(link),
        skuId: null,
        searchQuery: null,
        referencePrice: numberFromUnknown(row.price),
        source: "saved",
        lastCheckedAt: readString(row.updated_at) ?? readString(row.created_at),
      });
    }
    return out;
  } catch (e) {
    if (!isBenignStorageSchemaError(String(e))) logDevWarn("refresh_queue.saved", String(e));
    return [];
  }
}

/** Merge candidates; higher-priority source wins per normalized listing URL. */
export function dedupeRefreshCandidates(candidates: RefreshCandidate[]): RefreshCandidate[] {
  const byKey = new Map<string, RefreshCandidate>();
  const sourceRank: Record<RefreshJobSource, number> = { watchlist: 2, saved: 1 };

  for (const candidate of candidates) {
    const key = candidateKey(candidate.listingUrl);
    if (!key) continue;
    const prev = byKey.get(key);
    if (!prev || sourceRank[candidate.source] > sourceRank[prev.source]) {
      byKey.set(key, { ...candidate, listingUrl: candidate.listingUrl.trim() });
    }
  }

  return [...byKey.values()];
}

export function attachObservationMeta(
  candidates: RefreshCandidate[],
  observations: Map<string, AvailabilityObservationRow>
): RefreshJobTarget[] {
  return candidates.map((candidate) => {
    const key = candidateKey(candidate.listingUrl);
    const row = observations.get(candidate.listingUrl) ?? observations.get(key);
    const meta = row ? toObservationMeta(row) : null;
    return {
      jobId: key || candidate.listingUrl,
      listingUrl: candidate.listingUrl,
      title: candidate.title,
      store: candidate.store,
      skuId: candidate.skuId,
      searchQuery: candidate.searchQuery,
      referencePrice: candidate.referencePrice ?? row?.current_price ?? null,
      source: candidate.source,
      priority: 0,
      lastObservedAt: meta?.lastObservedAt ?? candidate.lastCheckedAt,
      freshnessScore: meta?.freshnessScore ?? null,
      ageHours: meta?.ageHours ?? (candidate.lastCheckedAt ? computeObservationAgeHours(candidate.lastCheckedAt) : null),
    };
  });
}

/** Load queue targets with latest observation metadata attached. */
export async function loadRefreshQueueTargets(): Promise<RefreshJobTarget[]> {
  const [watchlist, saved] = await Promise.all([
    loadWatchlistRefreshCandidates(),
    loadSavedProductRefreshCandidates(),
  ]);
  const deduped = dedupeRefreshCandidates([...watchlist, ...saved]);
  const observations = await getLatestObservationsByListingUrls(deduped.map((c) => c.listingUrl));
  return attachObservationMeta(deduped, observations);
}

/** Prevent duplicate refresh jobs within a run (by normalized listing URL). */
export function dedupeRefreshJobTargets(jobs: RefreshJobTarget[]): RefreshJobTarget[] {
  const seen = new Set<string>();
  const out: RefreshJobTarget[] = [];
  for (const job of jobs) {
    const key = candidateKey(job.listingUrl);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push({ ...job, jobId: key });
  }
  return out;
}

export function groupRefreshJobsBySearchQuery(jobs: RefreshJobTarget[]): Map<string, RefreshJobTarget[]> {
  const groups = new Map<string, RefreshJobTarget[]>();
  for (const job of jobs) {
    const query = buildRefreshSearchQuery(job);
    const bucket = groups.get(query) ?? [];
    bucket.push(job);
    groups.set(query, bucket);
  }
  return groups;
}
