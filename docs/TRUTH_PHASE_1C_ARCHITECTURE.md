# Phase 1C — SKU Identity Layer

**Date:** June 2026  
**Principle:** One product, many listings — NOT many listings, many products.

---

## Modules

| File | Role |
|------|------|
| `skuIdentityTypes.ts` | Types for registry, mappings, resolver methods |
| `productFingerprint.ts` | Brand/title/specs/capacity/color/size/model tokens |
| `skuResolver.ts` | GTIN → UPC → EAN → MPN → Brand+Model → Fingerprint |
| `crossMerchantLinking.ts` | Amazon/Walmart/BestBuy/Target/eBay normalization |
| `skuIdentityRegistry.ts` | Supabase persistence (service role) |
| `skuIdentity.ts` | Barrel exports |
| `refreshQueueSku.ts` | Attach known SKU ids to refresh targets |

---

## Resolver Priority

1. **GTIN** — 14-digit or labeled `GTIN:` → `gtin:{hash}` (confidence 98)
2. **UPC** — 12-digit → `upc:{hash}` (96)
3. **EAN** — 13-digit → `ean:{hash}` (96)
4. **MPN** — manufacturer part number → `mpn:{hash}` (88)
5. **Brand + Model** — `canonicalKey` hash → `bm:{hash}` (78)
6. **Fingerprint** — variant fingerprint → `fp:{hash}` (62)

---

## Tables

### `sku_identity_registry`

- `canonical_sku_id` (PK)
- `canonical_key`, `brand_key`, `model_key`
- `resolver_method`, `identity_confidence`
- `global_product_identity` (JSONB)
- `fingerprint` (JSONB)

### `sku_identity_mappings`

- `listing_url` (unique) → `canonical_sku_id`
- `merchant_key`, `merchant_listing_id`
- `match_confidence`, `resolver_method`

### `availability_observations.sku_id`

Stores `canonical_sku_id` (populated by refresh worker).

---

## Integration (no search/UI/verdict changes)

- **Refresh worker:** `resolveAndPersistSkuIdentity()` before observation insert
- **Refresh queue:** loads existing mappings for `skuId` on targets

---

## Migration

`supabase/migrations/20260604120000_phase1c_sku_identity.sql`
