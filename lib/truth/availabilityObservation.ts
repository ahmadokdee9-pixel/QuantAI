/**
 * Phase 1B.1 — Availability observation persistence (service-role only).
 * No search, verdict, or cron wiring in this step.
 */

import { logDevWarn } from "@/lib/log/devLog";
import { isBenignStorageSchemaError } from "@/lib/supabase/benignStorageError";
import { supabaseAdmin, supabaseAdminConfigured } from "@/lib/supabaseAdmin";
import {
  AVAILABILITY_STATUSES,
  type AvailabilityObservationInsert,
  type AvailabilityObservationRow,
  type AvailabilityStatus,
} from "@/lib/truth/availabilityObservationTypes";

export {
  AVAILABILITY_STATUSES,
  AVAILABILITY_OBSERVATION_SOURCES,
  type AvailabilityObservationInsert,
  type AvailabilityObservationRow,
  type AvailabilityObservationSource,
  type AvailabilityStatus,
} from "@/lib/truth/availabilityObservationTypes";

const TABLE = "availability_observations";

function clampFreshnessScore(score: number | undefined): number {
  if (score == null || !Number.isFinite(score)) return 100;
  return Math.min(100, Math.max(0, Math.round(score)));
}

function normalizeListingUrl(url: string): string {
  return url.trim();
}

function toNumericOrNull(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  return value;
}

function mapRow(raw: Record<string, unknown>): AvailabilityObservationRow | null {
  const id = typeof raw.id === "string" ? raw.id : null;
  const listing_url = typeof raw.listing_url === "string" ? raw.listing_url : null;
  const availability = typeof raw.availability === "string" ? raw.availability : null;
  const source = typeof raw.source === "string" ? raw.source : null;
  const observed_at = typeof raw.observed_at === "string" ? raw.observed_at : null;
  const created_at = typeof raw.created_at === "string" ? raw.created_at : null;
  const freshness_score = typeof raw.freshness_score === "number" ? raw.freshness_score : null;

  if (!id || !listing_url || !availability || !source || !observed_at || !created_at || freshness_score == null) {
    return null;
  }
  if (!isAvailabilityStatus(availability)) return null;

  return {
    id,
    listing_url,
    sku_id: typeof raw.sku_id === "string" ? raw.sku_id : null,
    observed_at,
    availability,
    availability_text: typeof raw.availability_text === "string" ? raw.availability_text : null,
    current_price: typeof raw.current_price === "number" ? raw.current_price : null,
    shipping_price: typeof raw.shipping_price === "number" ? raw.shipping_price : null,
    source,
    freshness_score,
    created_at,
  };
}

/** Type guard for allowed availability enum values. */
export function isAvailabilityStatus(value: string): value is AvailabilityStatus {
  return (AVAILABILITY_STATUSES as readonly string[]).includes(value);
}

/** Whether Supabase service role is configured for observation persistence. */
export function isAvailabilityObservationStorageConfigured(): boolean {
  return supabaseAdminConfigured;
}

/**
 * Insert one observation row via service role.
 * Returns null when storage is unavailable, validation fails, or insert errors.
 */
export async function insertAvailabilityObservation(
  input: AvailabilityObservationInsert
): Promise<AvailabilityObservationRow | null> {
  const db = supabaseAdmin;
  if (!db) return null;

  const listing_url = normalizeListingUrl(input.listing_url);
  if (!listing_url) return null;
  if (!isAvailabilityStatus(input.availability)) return null;

  const source = input.source?.trim();
  if (!source) return null;

  const payload = {
    listing_url,
    sku_id: input.sku_id?.trim() || null,
    observed_at: input.observed_at ?? new Date().toISOString(),
    availability: input.availability,
    availability_text: input.availability_text?.trim() || null,
    current_price: toNumericOrNull(input.current_price),
    shipping_price: toNumericOrNull(input.shipping_price),
    source,
    freshness_score: clampFreshnessScore(input.freshness_score),
  };

  try {
    const { data, error } = await db
      .from(TABLE)
      .insert(payload)
      .select(
        "id, listing_url, sku_id, observed_at, availability, availability_text, current_price, shipping_price, source, freshness_score, created_at"
      )
      .maybeSingle();

    if (error) {
      if (!isBenignStorageSchemaError(error.message)) {
        logDevWarn("availability_observations.insert", error.message);
      }
      return null;
    }

    if (!data || typeof data !== "object") return null;
    return mapRow(data as Record<string, unknown>);
  } catch (e) {
    if (!isBenignStorageSchemaError(String(e))) {
      logDevWarn("availability_observations.insert", String(e));
    }
    return null;
  }
}

/** Latest observation for a listing URL (service role read). */
export async function getLatestAvailabilityObservation(
  listingUrl: string
): Promise<AvailabilityObservationRow | null> {
  const db = supabaseAdmin;
  if (!db) return null;

  const listing_url = normalizeListingUrl(listingUrl);
  if (!listing_url) return null;

  try {
    const { data, error } = await db
      .from(TABLE)
      .select(
        "id, listing_url, sku_id, observed_at, availability, availability_text, current_price, shipping_price, source, freshness_score, created_at"
      )
      .eq("listing_url", listing_url)
      .order("observed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      if (!isBenignStorageSchemaError(error.message)) {
        logDevWarn("availability_observations.latest", error.message);
      }
      return null;
    }

    if (!data || typeof data !== "object") return null;
    return mapRow(data as Record<string, unknown>);
  } catch (e) {
    if (!isBenignStorageSchemaError(String(e))) {
      logDevWarn("availability_observations.latest", String(e));
    }
    return null;
  }
}

/** Recent observations for a listing URL, newest first (service role read). */
export async function listAvailabilityObservationsForListing(
  listingUrl: string,
  limit = 20
): Promise<AvailabilityObservationRow[]> {
  const db = supabaseAdmin;
  if (!db) return [];

  const listing_url = normalizeListingUrl(listingUrl);
  if (!listing_url) return [];

  const safeLimit = Math.min(100, Math.max(1, Math.round(limit)));

  try {
    const { data, error } = await db
      .from(TABLE)
      .select(
        "id, listing_url, sku_id, observed_at, availability, availability_text, current_price, shipping_price, source, freshness_score, created_at"
      )
      .eq("listing_url", listing_url)
      .order("observed_at", { ascending: false })
      .limit(safeLimit);

    if (error) {
      if (!isBenignStorageSchemaError(error.message)) {
        logDevWarn("availability_observations.list", error.message);
      }
      return [];
    }

    return (data ?? [])
      .map((row) => mapRow(row as Record<string, unknown>))
      .filter((row): row is AvailabilityObservationRow => row != null);
  } catch (e) {
    if (!isBenignStorageSchemaError(String(e))) {
      logDevWarn("availability_observations.list", String(e));
    }
    return [];
  }
}

/** Latest observation per listing URL (service role read, batch). */
export async function getLatestObservationsByListingUrls(
  listingUrls: string[]
): Promise<Map<string, AvailabilityObservationRow>> {
  const db = supabaseAdmin;
  const out = new Map<string, AvailabilityObservationRow>();
  if (!db || listingUrls.length === 0) return out;

  const urls = [...new Set(listingUrls.map((url) => normalizeListingUrl(url)).filter(Boolean))].slice(0, 200);
  if (urls.length === 0) return out;

  try {
    const { data, error } = await db
      .from(TABLE)
      .select(
        "id, listing_url, sku_id, observed_at, availability, availability_text, current_price, shipping_price, source, freshness_score, created_at"
      )
      .in("listing_url", urls)
      .order("observed_at", { ascending: false })
      .limit(Math.min(500, urls.length * 5));

    if (error) {
      if (!isBenignStorageSchemaError(error.message)) {
        logDevWarn("availability_observations.latest_batch", error.message);
      }
      return out;
    }

    for (const raw of data ?? []) {
      const row = mapRow(raw as Record<string, unknown>);
      if (!row || out.has(row.listing_url)) continue;
      out.set(row.listing_url, row);
    }
  } catch (e) {
    if (!isBenignStorageSchemaError(String(e))) {
      logDevWarn("availability_observations.latest_batch", String(e));
    }
  }

  return out;
}

/** Latest observation for a canonical SKU id (service role read). */
export async function getLatestAvailabilityObservationBySkuId(
  canonicalSkuId: string
): Promise<AvailabilityObservationRow | null> {
  const db = supabaseAdmin;
  if (!db) return null;

  const sku_id = canonicalSkuId.trim();
  if (!sku_id) return null;

  try {
    const { data, error } = await db
      .from(TABLE)
      .select(
        "id, listing_url, sku_id, observed_at, availability, availability_text, current_price, shipping_price, source, freshness_score, created_at"
      )
      .eq("sku_id", sku_id)
      .order("observed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      if (!isBenignStorageSchemaError(error.message)) {
        logDevWarn("availability_observations.latest_by_sku", error.message);
      }
      return null;
    }

    if (!data || typeof data !== "object") return null;
    return mapRow(data as Record<string, unknown>);
  } catch (e) {
    if (!isBenignStorageSchemaError(String(e))) {
      logDevWarn("availability_observations.latest_by_sku", String(e));
    }
    return null;
  }
}

/** Latest observation per canonical SKU id (service role read, batch). */
export async function getLatestObservationsBySkuIds(
  canonicalSkuIds: string[]
): Promise<Map<string, AvailabilityObservationRow>> {
  const db = supabaseAdmin;
  const out = new Map<string, AvailabilityObservationRow>();
  if (!db || canonicalSkuIds.length === 0) return out;

  const ids = [...new Set(canonicalSkuIds.map((id) => id.trim()).filter(Boolean))].slice(0, 200);
  if (ids.length === 0) return out;

  try {
    const { data, error } = await db
      .from(TABLE)
      .select(
        "id, listing_url, sku_id, observed_at, availability, availability_text, current_price, shipping_price, source, freshness_score, created_at"
      )
      .in("sku_id", ids)
      .order("observed_at", { ascending: false })
      .limit(Math.min(500, ids.length * 5));

    if (error) {
      if (!isBenignStorageSchemaError(error.message)) {
        logDevWarn("availability_observations.latest_by_sku_batch", error.message);
      }
      return out;
    }

    for (const raw of data ?? []) {
      const row = mapRow(raw as Record<string, unknown>);
      if (!row?.sku_id || out.has(row.sku_id)) continue;
      out.set(row.sku_id, row);
    }
  } catch (e) {
    if (!isBenignStorageSchemaError(String(e))) {
      logDevWarn("availability_observations.latest_by_sku_batch", String(e));
    }
  }

  return out;
}

