/**
 * Phase 1C — SKU identity registry persistence (service role only).
 */

import { logDevWarn } from "@/lib/log/devLog";
import type { QuantProduct } from "@/lib/shoppingScore";
import { isBenignStorageSchemaError } from "@/lib/supabase/benignStorageError";
import { supabaseAdmin, supabaseAdminConfigured } from "@/lib/supabaseAdmin";
import { resolveSkuIdentity } from "@/lib/truth/skuResolver";
import type {
  ResolvedSkuIdentity,
  SkuIdentityMappingRow,
  SkuIdentityPersistResult,
  SkuIdentityRegistryRow,
  SkuResolverMethod,
} from "@/lib/truth/skuIdentityTypes";

const REGISTRY_TABLE = "sku_identity_registry";
const MAPPINGS_TABLE = "sku_identity_mappings";

function normalizeListingUrl(url: string): string {
  return url.trim();
}

function mapRegistryRow(raw: Record<string, unknown>): SkuIdentityRegistryRow | null {
  const canonical_sku_id = typeof raw.canonical_sku_id === "string" ? raw.canonical_sku_id : null;
  const canonical_key = typeof raw.canonical_key === "string" ? raw.canonical_key : null;
  const resolver_method = typeof raw.resolver_method === "string" ? raw.resolver_method : null;
  const identity_confidence = typeof raw.identity_confidence === "number" ? raw.identity_confidence : null;
  const created_at = typeof raw.created_at === "string" ? raw.created_at : null;
  const updated_at = typeof raw.updated_at === "string" ? raw.updated_at : null;
  if (!canonical_sku_id || !canonical_key || !resolver_method || identity_confidence == null || !created_at || !updated_at) {
    return null;
  }
  return {
    canonical_sku_id,
    canonical_key,
    brand_key: typeof raw.brand_key === "string" ? raw.brand_key : null,
    model_key: typeof raw.model_key === "string" ? raw.model_key : null,
    resolver_method: resolver_method as SkuResolverMethod,
    identity_confidence,
    global_product_identity:
      raw.global_product_identity && typeof raw.global_product_identity === "object"
        ? (raw.global_product_identity as SkuIdentityRegistryRow["global_product_identity"])
        : ({} as SkuIdentityRegistryRow["global_product_identity"]),
    fingerprint:
      raw.fingerprint && typeof raw.fingerprint === "object"
        ? (raw.fingerprint as SkuIdentityRegistryRow["fingerprint"])
        : ({} as SkuIdentityRegistryRow["fingerprint"]),
    created_at,
    updated_at,
  };
}

export function isSkuIdentityStorageConfigured(): boolean {
  return supabaseAdminConfigured;
}

export async function upsertSkuIdentityRegistry(identity: ResolvedSkuIdentity): Promise<boolean> {
  const db = supabaseAdmin;
  if (!db) return false;

  const now = new Date().toISOString();
  try {
    const { error } = await db.from(REGISTRY_TABLE).upsert(
      {
        canonical_sku_id: identity.canonicalSkuId,
        canonical_key: identity.canonicalKey,
        brand_key: identity.globalProductIdentity.brandKey,
        model_key: identity.globalProductIdentity.modelKey,
        resolver_method: identity.resolverMethod,
        identity_confidence: identity.identityConfidence,
        global_product_identity: identity.globalProductIdentity,
        fingerprint: identity.fingerprint,
        updated_at: now,
      },
      { onConflict: "canonical_sku_id" }
    );
    if (error) {
      if (!isBenignStorageSchemaError(error.message)) logDevWarn("sku_identity_registry.upsert", error.message);
      return false;
    }
    return true;
  } catch (e) {
    if (!isBenignStorageSchemaError(String(e))) logDevWarn("sku_identity_registry.upsert", String(e));
    return false;
  }
}

export async function upsertSkuIdentityMapping(args: {
  identity: ResolvedSkuIdentity;
  listingUrl: string;
}): Promise<boolean> {
  const db = supabaseAdmin;
  if (!db) return false;

  const listing_url = normalizeListingUrl(args.listingUrl);
  if (!listing_url) return false;

  const now = new Date().toISOString();
  try {
    const { error } = await db.from(MAPPINGS_TABLE).upsert(
      {
        canonical_sku_id: args.identity.canonicalSkuId,
        listing_url,
        merchant_key: args.identity.merchantKey,
        merchant_listing_id: args.identity.merchantListingId,
        match_confidence: args.identity.identityConfidence,
        resolver_method: args.identity.resolverMethod,
        updated_at: now,
      },
      { onConflict: "listing_url" }
    );
    if (error) {
      if (!isBenignStorageSchemaError(error.message)) logDevWarn("sku_identity_mappings.upsert", error.message);
      return false;
    }
    return true;
  } catch (e) {
    if (!isBenignStorageSchemaError(String(e))) logDevWarn("sku_identity_mappings.upsert", String(e));
    return false;
  }
}

/** Resolve + persist registry row and listing mapping. */
export async function resolveAndPersistSkuIdentity(args: {
  product: QuantProduct;
  listingUrl: string;
  searchQuery?: string | null;
}): Promise<SkuIdentityPersistResult | null> {
  const identity = resolveSkuIdentity(args);
  const registryUpserted = await upsertSkuIdentityRegistry(identity);
  const mappingUpserted = await upsertSkuIdentityMapping({ identity, listingUrl: args.listingUrl });
  if (!registryUpserted && !mappingUpserted) return null;
  return {
    canonicalSkuId: identity.canonicalSkuId,
    merchantKey: identity.merchantKey,
    resolverMethod: identity.resolverMethod,
    identityConfidence: identity.identityConfidence,
    registryUpserted,
    mappingUpserted,
  };
}

export async function getCanonicalSkuIdForListing(listingUrl: string): Promise<string | null> {
  const db = supabaseAdmin;
  if (!db) return null;
  const listing_url = normalizeListingUrl(listingUrl);
  if (!listing_url) return null;

  try {
    const { data, error } = await db
      .from(MAPPINGS_TABLE)
      .select("canonical_sku_id")
      .eq("listing_url", listing_url)
      .maybeSingle();
    if (error) {
      if (!isBenignStorageSchemaError(error.message)) logDevWarn("sku_identity_mappings.lookup", error.message);
      return null;
    }
    return typeof data?.canonical_sku_id === "string" ? data.canonical_sku_id : null;
  } catch (e) {
    if (!isBenignStorageSchemaError(String(e))) logDevWarn("sku_identity_mappings.lookup", String(e));
    return null;
  }
}

export async function getSkuMappingsByListingUrls(
  listingUrls: string[]
): Promise<Map<string, SkuIdentityMappingRow>> {
  const db = supabaseAdmin;
  const out = new Map<string, SkuIdentityMappingRow>();
  if (!db || listingUrls.length === 0) return out;

  const urls = [...new Set(listingUrls.map(normalizeListingUrl).filter(Boolean))].slice(0, 200);
  try {
    const { data, error } = await db
      .from(MAPPINGS_TABLE)
      .select(
        "id, canonical_sku_id, listing_url, merchant_key, merchant_listing_id, match_confidence, resolver_method, created_at, updated_at"
      )
      .in("listing_url", urls);
    if (error) {
      if (!isBenignStorageSchemaError(error.message)) logDevWarn("sku_identity_mappings.batch", error.message);
      return out;
    }
    for (const raw of data ?? []) {
      const listing_url = typeof raw.listing_url === "string" ? raw.listing_url : null;
      const canonical_sku_id = typeof raw.canonical_sku_id === "string" ? raw.canonical_sku_id : null;
      const id = typeof raw.id === "string" ? raw.id : null;
      if (!listing_url || !canonical_sku_id || !id) continue;
      out.set(listing_url, {
        id,
        canonical_sku_id,
        listing_url,
        merchant_key: typeof raw.merchant_key === "string" ? raw.merchant_key : "unknown",
        merchant_listing_id: typeof raw.merchant_listing_id === "string" ? raw.merchant_listing_id : null,
        match_confidence: typeof raw.match_confidence === "number" ? raw.match_confidence : 50,
        resolver_method: (typeof raw.resolver_method === "string"
          ? raw.resolver_method
          : "fingerprint") as SkuResolverMethod,
        created_at: typeof raw.created_at === "string" ? raw.created_at : new Date().toISOString(),
        updated_at: typeof raw.updated_at === "string" ? raw.updated_at : new Date().toISOString(),
      });
    }
  } catch (e) {
    if (!isBenignStorageSchemaError(String(e))) logDevWarn("sku_identity_mappings.batch", String(e));
  }
  return out;
}

export async function getSkuIdentityRegistry(
  canonicalSkuId: string
): Promise<SkuIdentityRegistryRow | null> {
  const db = supabaseAdmin;
  if (!db) return null;
  try {
    const { data, error } = await db
      .from(REGISTRY_TABLE)
      .select(
        "canonical_sku_id, canonical_key, brand_key, model_key, resolver_method, identity_confidence, global_product_identity, fingerprint, created_at, updated_at"
      )
      .eq("canonical_sku_id", canonicalSkuId)
      .maybeSingle();
    if (error) {
      if (!isBenignStorageSchemaError(error.message)) logDevWarn("sku_identity_registry.lookup", error.message);
      return null;
    }
    if (!data || typeof data !== "object") return null;
    return mapRegistryRow(data as Record<string, unknown>);
  } catch (e) {
    if (!isBenignStorageSchemaError(String(e))) logDevWarn("sku_identity_registry.lookup", String(e));
    return null;
  }
}

export type { ResolvedSkuIdentity, SkuIdentityMappingRow, SkuIdentityPersistResult, SkuIdentityRegistryRow } from "@/lib/truth/skuIdentityTypes";
