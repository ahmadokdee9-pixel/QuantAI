# Phase 4 — Canonical Identity Foundation Report

**Generated:** 2026-05-24  
**Status:** Complete (code + CI; no production deploy)  
**Discipline:** Shadow-only · no APPLY · no ranking mutation · no embeddings · no vector DB

---

## Executive summary

Phase 4 introduces a **deterministic canonical commerce identity layer** under `lib/intelligence/identity/`, building on Phase 0–2 normalization without embeddings or vector retrieval. It provides:

- Canonical product graph + merchant offer linking  
- Variant boundary engine with accessory/bundle guards  
- CommerceId-keyed price history (in-memory, tray-scoped)  
- Trust-native signal preparation  
- Retrieval **contracts** + keyword-only canonical surface (no vectors)

**Verdict:** Safe to enable shadow telemetry in production alongside normalization. **Not** ready for semantic retrieval layer until blockers below are cleared.

---

## Deliverables map

| # | Deliverable | Path |
|---|-------------|------|
| 1 | Canonical product graph | `lib/intelligence/identity/canonicalProductGraph.ts` |
| 2 | Product identity resolver | `lib/intelligence/identity/productIdentityResolver.ts` |
| 3 | Variant boundary engine | `lib/intelligence/identity/variantBoundaryEngine.ts` |
| 4 | Merchant offer linker | `lib/intelligence/identity/merchantOfferLinker.ts` |
| 5 | Title / edition normalization | `lib/intelligence/identity/titleNormalization.ts` |
| 6 | Price history store | `lib/intelligence/identity/pricing/priceHistoryStore.ts` |
| 7 | Fake discount (identity-aware) | `lib/intelligence/identity/pricing/fakeDiscountDetector.ts` |
| 8 | Merchant price timeline | `lib/intelligence/identity/pricing/merchantPriceTimeline.ts` |
| 9 | Trust signals | `lib/intelligence/identity/trust/trustSignals.ts` |
| 10 | Retrieval contracts | `lib/intelligence/identity/retrieval/retrievalContracts.ts` |
| 11 | Canonical retrieval surface | `lib/intelligence/identity/retrieval/canonicalRetrievalSurface.ts` |
| 12 | Orchestrator | `lib/intelligence/identity/buildIdentityFoundation.ts` |

---

## Identity graph coverage (offline golden)

| Metric | Measured (CI) |
|--------|----------------|
| Tray listings preserved | 100% (no mutation) |
| Merchant offers linked | 1:1 listing → offer |
| Canonical nodes per golden tray | > 0 |
| Identity coverage | > 0 (tray-linked) |
| Replay-stable commerceIds | Twin runs match |

Enable live observation:

```bash
QUANTAI_IDENTITY_FOUNDATION_ENABLED=true
QUANTAI_IDENTITY_FOUNDATION_OBSERVABILITY=true
# Keep normalization shadow:
QUANTAI_NORMALIZATION_ENABLED=true
QUANTAI_NORMALIZATION_MODE=shadow
QUANTAI_NORMALIZATION_APPLY=false
```

---

## False-collapse resistance

| Guard | Mechanism |
|-------|-----------|
| Storage / color / size / tier | Reuses + extends `normalization/variantBoundary` |
| Cross-generation (AirPods Pro 2 vs Pro) | `model_tier` axis conflict |
| Accessory vs product | `accessory_product_confusion` (case/cover vs device) |
| Bundle contamination | `bundle_contamination` when only one side is bundle |
| Merge gate | `canMergeIdentities()` → `blocked_variant_boundary` |

**CI:** `npm run test:variant-boundaries` — storage, generation, accessory, merge-block tests pass.

---

## Merchant normalization quality

- **Offer graph:** `canonicalProduct` → N merchant offers with trust, warehouse confidence, duplicate-seller risk  
- **Deterministic IDs:** `qcid_*`, `qcp4_*`, `qlk_*`, `qrk_*` (aligned with Phase 0 normalization)  
- **Same-store dedup:** Delegates to existing normalization pipeline; Phase 4 observes collapse counts in meta  

---

## Pricing-history readiness

| Component | Status |
|-----------|--------|
| `PriceHistoryStore` | In-memory, commerceId+store keyed, max 12 snapshots |
| `ingestTrayPrices` | Called on each identity foundation build |
| `merchantPriceTimeline` | Volatility + trend per merchant offer |
| `detectIdentityFakeDiscount` | Wraps tray heuristics + historical median context |

**Gap:** No persistent cross-session DB — client `marketMemory` remains link-keyed. Phase 5+ should persist by `commerceId`.

---

## Trust ranking preparation

Deterministic `TrustSignalBundle` per `commerceId`:

| Signal | Description |
|--------|-------------|
| `merchantConsistency01` | Low spread of store trust scores across offers |
| `suspiciousDiscountSpike01` | Historical + tray fake-discount composite |
| `fakeMsrpPattern01` | Inflated MSRP vs sale price |
| `duplicateSellerIdentity01` | Same store repeated in offer graph |
| `warehouseConfidence01` | Marketplace / fulfillment heuristics |
| `explanations[]` | Human-readable trust trace (meta only) |

**Not wired to ranking** — shadow meta export only.

---

## Retrieval-safe architecture

| Contract field | Value |
|----------------|-------|
| `embeddingFree` | `true` (required) |
| `vectorDbFree` | `true` (required) |
| `rankingMutation` | `false` (required) |
| `shadowOnly` | `true` |
| Retrieval mode | `canonical_surface` — **keyword token overlap only** |

`buildCanonicalRetrievalSurface()` ranks canonical nodes by keyword score + identity confidence — **no vectors**.

---

## Observability (search meta)

When `QUANTAI_IDENTITY_FOUNDATION_ENABLED=true`:

```json
{
  "identityFoundation": {
    "version": "phase4.0",
    "shadowOnly": true,
    "canonicalProductCount": 12,
    "identityCoverage": 0.95,
    "falseCollapseBlocked": 0,
    "avgIdentityConfidence": 0.82
  },
  "identityFoundationShadow": {
    "canonicalProducts": [...],
    "boundaryTraceCount": 8,
    "conflictTraceCount": 2,
    "retrievalSurfaceId": "crs_...",
    "trustSample": [...]
  }
}
```

Pipeline stage: `identity_foundation` in `pipelineTrace`.

---

## Changed files

| Area | Files |
|------|-------|
| New module | `lib/intelligence/identity/**` (15 files) |
| Search route | `app/api/search/route.ts` — post-normalization shadow hook |
| CI | `scripts/test-identity*.mjs`, `test-variant-boundaries.mjs`, `test-merchant-link-consistency.mjs` |
| Config | `package.json`, `.env.example`, `search-meta-lifecycle-guard.mjs` |

**Not changed:** UI, product cards, compare UX, copilot/chat, semantic rerank order, APPLY flags.

---

## Validation (executed)

```bash
npm run build                 # PASS
npm run test                  # PASS (phase4 + phase3 + normalization + meta lifecycle)
npm run test:identity         # PASS
npm run test:variant-boundaries # PASS
npm run test:replay-determinism # PASS
```

---

## Blockers before retrieval layer (Phase 5+)

1. **Persistent identity registry** — tray-local graph only; no cross-search `commerceId` store  
2. **Normalization APPLY** — still blocked (Phase 2 gates); identity assumes shadow normalization meta  
3. **Live false-collapse = 0** — deploy variant boundary + re-run `phase2-apply-readiness`  
4. **Unified ID facade** — `qcid_*` vs `qcp_*` vs `fam_*` not fully merged  
5. **CommerceId price persistence** — history store is in-process only  
6. **Semantic / vector retrieval** — explicitly out of scope for Phase 4  

---

## Rollback

- Disable: `QUANTAI_IDENTITY_FOUNDATION_ENABLED=false`  
- Remove route hook (single `buildIdentityFoundation` block) if needed  
- No schema migration  

---

## Recommended deploy sequence

1. Deploy Phase 3 + Phase 4 code  
2. Enable normalization shadow (existing Stage 1 env)  
3. Enable `QUANTAI_IDENTITY_FOUNDATION_ENABLED=true`  
4. Monitor `identityFoundation.falseCollapseBlocked`, `identityCoverage`, `conflictTraceCount`  
5. Do **not** enable APPLY or retrieval vectors until Phase 2 verdict + persistence RFC  

---

*Phase 4 completes the deterministic identity substrate for trust ranking and future retrieval — without mutating production ranking or introducing embeddings.*
