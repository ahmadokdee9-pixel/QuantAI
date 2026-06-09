# Phase 1D.5 — Truth Confidence Integration

**Principle:** Truth signals may downgrade recommendations; they must not promote BUY READY or inflate verdicts.

---

## Scope Delivered

| Area | Module | Change |
|------|--------|--------|
| Evidence types | `lib/truth/truthFoundationTypes.ts` | `ExtendedTruthEvidenceSources`, `TruthFoundationSnapshot` |
| Evidence builder | `lib/truth/truthEvidenceBuilder.ts` | `buildTruthFoundationSnapshot`, `buildExtendedTruthEvidenceSources`, `attachTruthFoundationToDecision` |
| Discount language | `lib/truth/truthDiscountLanguage.ts` | Phase 1A-safe discount labels |
| Confidence gate | `lib/truth/truthConfidenceGate.ts` | Extended `computeTruthConfidence`, downgrade-only `applyTruthConfidenceGate` |
| Intel snapshot | `lib/ui/universalProductDecision.ts` | Optional `truthFoundation` on product intelligence |
| Activation | `lib/ui/phase45ProductionReadinessActivation.ts` | Attach foundation before sanitize (no search route change) |

---

## Extended TruthEvidenceSources

Legacy fields retained; Phase 1B–1D fields added:

| Field | Source |
|-------|--------|
| `priceTruthConfidence` | `PriceTruthBundle.priceTruthConfidence` |
| `discountEvidence` | `PriceTruthBundle.discountEvidence` |
| `baselineCoverage` | `PriceTruthBundle.baselineCoverage` |
| `availabilityFreshness` | Availability snapshot `freshnessScore` |
| `listingAgeHours` | Availability snapshot age |
| `availabilityStatus` | Classified DB status |
| `canonicalSkuId` | Phase 1C resolver |
| `skuIdentityConfidence` | Phase 1C resolver |
| `discountVerificationState` | Internal discount state |

---

## computeTruthConfidence()

Weighted score (0–1) from:

- Price history samples (legacy + `baselineCoverage.samples90d`)
- `priceTruthConfidence`
- SKU identity confidence
- Market coverage
- Discount verification state (no boost when `discountFake`)
- Merchant trust
- Availability freshness
- Listing price presence

Alignment flags recorded in gate output (`phase1d5_*`).

---

## applyTruthGateToDecision() — Downgrade Rules

**Never promotes** COMPARE/WAIT → BUY READY / STRONG BUY / BEST DEAL.

| Risk signal | Gate | Downgrade |
|-------------|------|-----------|
| Listing age > 24h | `downgrade_stale_listing_24h` | → WAIT |
| Out of stock / removed / seller unavailable | `downgrade_listing_unavailable` | → WAIT + INSUFFICIENT DATA |
| Unknown availability + low freshness | `downgrade_unknown_availability` | → WAIT |
| Fake discount (`isFake`) | `downgrade_fake_discount_risk` | → COMPARE |
| Insufficient price history | `downgrade_insufficient_price_history` | → COMPARE |
| Weak SKU identity (< 55) | `downgrade_weak_sku_identity_phase1c` | → COMPARE |
| Low truth confidence | `downgrade_*_insufficient_truth` | Tier-appropriate downgrade |

Unavailable listings preserve `INSUFFICIENT DATA` verdict (not overridden by WAIT mapping).

---

## Qualified Discount Language

Internal state → Phase 1A-safe label (`truthDiscountLanguage.ts`):

| Internal | Display label |
|----------|---------------|
| `VERIFIED_DISCOUNT` | Evidence-backed discount signal |
| `POSSIBLE_DISCOUNT` | Possible discount signal |
| `UNVERIFIED_DISCOUNT` | Unverified discount signal |
| `NO_DISCOUNT` | No discount signal observed |

No raw "Verified Discount" / "Best Deal" strings.

---

## Data Flow

```
Phase 45 activation
  → attachTruthFoundationToDecision(product, marketMemory)
  → buildTruthFoundationSnapshot (sync: SKU resolve + price truth from memory rows)
  → sanitizeUniversalDecision
  → applyTruthGateToDecision
  → computeTruthConfidence + applyTruthConfidenceGate
```

Search route **unchanged**. Stale availability downgrades activate when `truthFoundation.availability.listingAgeHours > 24` (future DB-read path or worker-enriched snapshots).

---

## Tests

| Script | Checks |
|--------|--------|
| `npm run test:phase1d5-truth-confidence` | 10 gate + language + attach checks |
| `npm run test:phase1-truth-regression` | 1B + 1C + 1D + 1D.5 (55 total) |

---

## Boundaries (unchanged)

- No UI redesign
- No search route wiring
- No BUY READY promotion logic
- Phase 45 confidence floors (70/85/90) still apply before truth gate

---

## Next: Phase 1E

Truth Foundation Stabilization — DB-backed availability freshness at read time, observability, and gate tuning.
