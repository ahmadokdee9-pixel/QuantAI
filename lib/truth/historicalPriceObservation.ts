/**
 * Phase 1D — Historical price observation persistence (service role only).
 */

import { logDevWarn } from "@/lib/log/devLog";
import { isBenignStorageSchemaError } from "@/lib/supabase/benignStorageError";
import { supabaseAdmin, supabaseAdminConfigured } from "@/lib/supabaseAdmin";
import type {
  HistoricalPriceObservationInsert,
  HistoricalPriceObservationRow,
} from "@/lib/truth/priceHistoryTypes";

const TABLE = "historical_price_observations";

function mapRow(raw: Record<string, unknown>): HistoricalPriceObservationRow | null {
  const id = typeof raw.id === "string" ? raw.id : null;
  const canonical_sku_id = typeof raw.canonical_sku_id === "string" ? raw.canonical_sku_id : null;
  const merchant_key = typeof raw.merchant_key === "string" ? raw.merchant_key : null;
  const observed_price = typeof raw.observed_price === "number" ? raw.observed_price : null;
  const currency = typeof raw.currency === "string" ? raw.currency : null;
  const observed_at = typeof raw.observed_at === "string" ? raw.observed_at : null;
  const source = typeof raw.source === "string" ? raw.source : null;
  const created_at = typeof raw.created_at === "string" ? raw.created_at : null;
  if (!id || !canonical_sku_id || !merchant_key || observed_price == null || !currency || !observed_at || !source || !created_at) {
    return null;
  }
  if (observed_price <= 0) return null;
  return {
    id,
    canonical_sku_id,
    merchant_key,
    listing_url: typeof raw.listing_url === "string" ? raw.listing_url : null,
    observed_price,
    currency,
    observed_at,
    availability_status: typeof raw.availability_status === "string" ? raw.availability_status : null,
    source,
    created_at,
  };
}

export function isHistoricalPriceStorageConfigured(): boolean {
  return supabaseAdminConfigured;
}

export async function insertHistoricalPriceObservation(
  input: HistoricalPriceObservationInsert
): Promise<HistoricalPriceObservationRow | null> {
  const db = supabaseAdmin;
  if (!db) return null;

  const canonical_sku_id = input.canonical_sku_id?.trim();
  const merchant_key = input.merchant_key?.trim();
  if (!canonical_sku_id || !merchant_key || !Number.isFinite(input.observed_price) || input.observed_price <= 0) {
    return null;
  }

  const payload = {
    canonical_sku_id,
    merchant_key,
    listing_url: input.listing_url?.trim() || null,
    observed_price: input.observed_price,
    currency: (input.currency ?? "EUR").trim().slice(0, 8) || "EUR",
    observed_at: input.observed_at ?? new Date().toISOString(),
    availability_status: input.availability_status ?? null,
    source: (input.source ?? "cron_refresh").trim() || "cron_refresh",
  };

  try {
    const { data, error } = await db
      .from(TABLE)
      .insert(payload)
      .select(
        "id, canonical_sku_id, merchant_key, listing_url, observed_price, currency, observed_at, availability_status, source, created_at"
      )
      .maybeSingle();
    if (error) {
      if (!isBenignStorageSchemaError(error.message)) logDevWarn("historical_price_observations.insert", error.message);
      return null;
    }
    if (!data || typeof data !== "object") return null;
    return mapRow(data as Record<string, unknown>);
  } catch (e) {
    if (!isBenignStorageSchemaError(String(e))) logDevWarn("historical_price_observations.insert", String(e));
    return null;
  }
}

export async function listHistoricalPriceObservationsForSku(
  canonicalSkuId: string,
  limit = 500
): Promise<HistoricalPriceObservationRow[]> {
  const db = supabaseAdmin;
  if (!db) return [];
  const id = canonicalSkuId.trim();
  if (!id) return [];

  const safeLimit = Math.min(1000, Math.max(1, Math.round(limit)));
  try {
    const { data, error } = await db
      .from(TABLE)
      .select(
        "id, canonical_sku_id, merchant_key, listing_url, observed_price, currency, observed_at, availability_status, source, created_at"
      )
      .eq("canonical_sku_id", id)
      .order("observed_at", { ascending: false })
      .limit(safeLimit);
    if (error) {
      if (!isBenignStorageSchemaError(error.message)) logDevWarn("historical_price_observations.list", error.message);
      return [];
    }
    return (data ?? [])
      .map((row) => mapRow(row as Record<string, unknown>))
      .filter((row): row is HistoricalPriceObservationRow => row != null);
  } catch (e) {
    if (!isBenignStorageSchemaError(String(e))) logDevWarn("historical_price_observations.list", String(e));
    return [];
  }
}

/** Historical price observations for multiple canonical SKUs (service role read, batch). */
export async function listHistoricalPriceObservationsForSkus(
  canonicalSkuIds: string[],
  limitPerSku = 120
): Promise<Map<string, HistoricalPriceObservationRow[]>> {
  const db = supabaseAdmin;
  const out = new Map<string, HistoricalPriceObservationRow[]>();
  if (!db || canonicalSkuIds.length === 0) return out;

  const ids = [...new Set(canonicalSkuIds.map((id) => id.trim()).filter(Boolean))].slice(0, 200);
  if (ids.length === 0) return out;

  const safeLimit = Math.min(1000, Math.max(1, Math.round(limitPerSku)));
  try {
    const { data, error } = await db
      .from(TABLE)
      .select(
        "id, canonical_sku_id, merchant_key, listing_url, observed_price, currency, observed_at, availability_status, source, created_at"
      )
      .in("canonical_sku_id", ids)
      .order("observed_at", { ascending: false })
      .limit(Math.min(2000, ids.length * safeLimit));

    if (error) {
      if (!isBenignStorageSchemaError(error.message)) logDevWarn("historical_price_observations.list_batch", error.message);
      return out;
    }

    for (const raw of data ?? []) {
      const row = mapRow(raw as Record<string, unknown>);
      if (!row) continue;
      const bucket = out.get(row.canonical_sku_id) ?? [];
      if (bucket.length >= safeLimit) continue;
      bucket.push(row);
      out.set(row.canonical_sku_id, bucket);
    }
  } catch (e) {
    if (!isBenignStorageSchemaError(String(e))) logDevWarn("historical_price_observations.list_batch", String(e));
  }

  return out;
}

/** Skip duplicate price point within 24h at same price (dedupe writes). */
export function isDuplicateHistoricalPriceObservation(
  prior: HistoricalPriceObservationRow | null | undefined,
  next: HistoricalPriceObservationInsert
): boolean {
  if (!prior) return false;
  if (prior.canonical_sku_id !== next.canonical_sku_id) return false;
  if (prior.merchant_key !== next.merchant_key) return false;
  const rel = Math.abs(prior.observed_price - next.observed_price) / Math.max(prior.observed_price, next.observed_price);
  if (rel > 0.005) return false;
  const ageMs = Date.parse(next.observed_at ?? new Date().toISOString()) - Date.parse(prior.observed_at);
  return Number.isFinite(ageMs) && ageMs >= 0 && ageMs < 24 * 60 * 60 * 1000;
}

export async function getLatestHistoricalPriceObservation(args: {
  canonicalSkuId: string;
  merchantKey: string;
}): Promise<HistoricalPriceObservationRow | null> {
  const db = supabaseAdmin;
  if (!db) return null;
  try {
    const { data, error } = await db
      .from(TABLE)
      .select(
        "id, canonical_sku_id, merchant_key, listing_url, observed_price, currency, observed_at, availability_status, source, created_at"
      )
      .eq("canonical_sku_id", args.canonicalSkuId.trim())
      .eq("merchant_key", args.merchantKey.trim())
      .order("observed_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) {
      if (!isBenignStorageSchemaError(error.message)) logDevWarn("historical_price_observations.latest", error.message);
      return null;
    }
    if (!data || typeof data !== "object") return null;
    return mapRow(data as Record<string, unknown>);
  } catch (e) {
    if (!isBenignStorageSchemaError(String(e))) logDevWarn("historical_price_observations.latest", String(e));
    return null;
  }
}
