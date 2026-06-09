# Phase 1A — Truth Language Audit (Pre-Change)

**Date:** June 2026  
**Scope:** Every user-visible label, badge, verdict, chip, hero message, and decision output implying external verification without dedicated evidence.

## Audit Method

- Ripgrep across `lib/`, `components/`, `app/` for verification language
- Trace active UI path: `ProductResultsSurface` → Phase 45 → card chips / brief / hero
- Classify: **User-visible** vs **Internal-only** vs **SEO/marketing**

---

## Critical User-Visible Locations (Priority 1)

| File | Line(s) | Current claim | Risk | Action |
|------|---------|---------------|------|--------|
| `lib/ui/intelligenceCardSignals.ts` | 88, 119–150, 206–228, 264, 285, 295 | Verified lane, Trusted retailer, Verified seller, Trust verified, Best value among trusted sellers | Critical | Qualify all |
| `lib/ui/intelligenceExposureActivation.ts` | 259, 267, 281 | Trusted Seller chip | Critical | Seller Trust Signal |
| `lib/ui/phase42CommerceIntelligenceCoreActivation.ts` | 50, 53, 216 | BEST DEAL, Verified Discount chips | Critical | Likely Deal, Discount Signal |
| `lib/intelligence/discountConfidenceEngine.ts` | 11–14, 84–91 | Verified Discount labels + displayLine | Critical | Discount Signal taxonomy |
| `lib/intelligence/realDiscountProofEngine.ts` | 13–14, 39, 87 | Verified Discount band | Critical | Discount Signal |
| `lib/intelligence/realDiscountValidationV3Engine.ts` | 53 | "Real savings verified against market median" | Critical | Qualify reasoning |
| `lib/intelligence/realMerchantVerificationEngine.ts` | 9, 49–54, 91 | Elite Merchant, marketplaceVerified, Verified marketplace retailer | Critical | Trust signal language |
| `lib/intelligence/merchantReliabilityEngine.ts` | 9, 30, 45, 106 | Elite/Trusted Merchant labels | High | Trust signal labels |
| `lib/intelligence/commercePriceHistoryEngine.ts` | 16, 46, 54 | Historical Low label + reasoning | Critical | Observed price signal |
| `lib/intelligence/globalPriceIntelligenceEngine.ts` | 15, 79, 91–92 | BEST PRICE FOUND, "Best price found in this search universe" | Critical | Market sample lowest |
| `lib/intelligence/discountIntelligenceV2Engine.ts` | 12, 84–98 | BEST DEAL FOUND reasoning | Critical | Likely deal signal |
| `lib/intelligence/billionDollarDiscountEngine.ts` | 13, 16, 49–80 | BEST DEAL FOUND, REAL DISCOUNT labels | Critical | Qualified labels |
| `lib/intelligence/decisionBriefEngine.ts` | 151 | Best Verified Discount hero | Critical | Discount signal hero |
| `lib/intelligence/phase93TrustDiscountHardening.ts` | 275, 447 | Best Verified Discount, Verified discount authenticity | Critical | Qualify |
| `lib/intelligence/discountIntelligenceLayer.ts` | 19, 107 | Best Verified Discount | Critical | Qualify |
| `lib/intelligence/commerceDecisionCoreEngine.ts` | 107–114, 133–134 | tierToPriorityLabel BEST DEAL FOUND, verified discount reasoning | High | Gate + qualify |
| `lib/intelligence/decisionCalibrationEngine.ts` | 105–113 | verified discount, elite merchant, best deal reasoning | High | Qualify |
| `lib/intelligence/evidenceConfidenceEngine.ts` | 15, 65 | verified_deal band | High | signal_deal band |
| `lib/intelligence/globalBuyOpportunityEngine.ts` | 94 | verified discount in buyReasoning | High | Qualify |
| `lib/ui/globalCommerceBriefEnrichment.ts` | 25 | Best deal found in current search universe | Critical | Qualify |
| `lib/ui/commerceDominanceVerdictEngine.ts` | 19, 73 | BEST DEAL FOUND priority | High | LIKELY DEAL SIGNAL |
| `lib/ui/calibratedCommerceVerdictEngine.ts` | 95 | BEST DEAL FOUND | High | Qualify |
| `lib/ui/globalCommerceVerdictEngine.ts` | 18, 58–59 | BEST DEAL FOUND | High | Qualify |
| `lib/ui/cardIntelligenceLayer.ts` | 61 | Trusted seller | High | Qualify |
| `lib/intelligence/bestPlaceToBuyEngine.ts` | 59–62 | best price found, Trusted seller | High | Qualify |
| `lib/intelligence/opportunityDetectionEngine.ts` | 144, 149 | Verified Discount, Elite Merchant drivers | High | Qualify |
| `lib/intelligence/decisionReasoningEngine.ts` | 146, 149 | Verified Discount, Elite Merchant focus | High | Qualify |
| `components/cosmic/DecisionSnapshotStrip.tsx` | 18, 25 | Trust verified | Critical | Qualify |
| `components/cosmic/CommandMetricsStrip.tsx` | 22 | Verified | High | Signal-based |
| `components/search/IntelligenceMatrix.tsx` | 93 | Verified | High | Qualify |
| `components/search/LiveIntelligenceMetrics.tsx` | 48, 50 | Trusted sellers, Verified merchant read | High | Qualify |
| `lib/ui/productImageQuality.ts` | 44, 108 | Verified catalog/retail imagery | Medium | Qualify |
| `lib/intelligence/marketContextEngine.ts` | 146, 269, 282 | Verified discount, trusted retailer | High | Qualify |
| `lib/intelligence/verdictEngine.ts` | 270 | Trusted retailer | High | Qualify |
| `lib/intelligence/recommendationClassification.ts` | 101, 117 | Best verified discount, Trusted seller | High | Qualify |

## Internal Pipeline (Priority 2 — reasoning strings still user-visible via cards)

| File | Claims | Action |
|------|--------|--------|
| `lib/intelligence/buySignalBalancingEngine.ts` | Promotes to BUY READY/BEST DEAL | Gate after balance |
| `lib/intelligence/productionSafetyEngine.ts` | Confidence floors for BUY READY | Respect truth gate |
| `lib/intelligence/bestDealFoundEngine.ts` | isBestDealFound strict criteria | Keep internal; qualify display |
| `lib/intelligence/bestDealDominanceEngine.ts` | BEST DEAL FOUND holder | Internal tier only |
| `lib/ui/buyWaitActivation.ts` | historical low | Qualify |
| `lib/ui/discountTruthActivation.ts` | historical low, Genuine | Qualify |
| `lib/ui/priceTargetActivation.ts` | historical low | Qualify |
| `lib/intelligence/dealIntelligenceEngine.ts` | Best Deal Today, Verified Discount | Qualify display labels |
| `lib/intelligence/intelligenceActivationEngine.ts` | Real discount signal | Qualify |

## Components / Marketing (Priority 3)

| File | Claims | Action |
|------|--------|--------|
| `components/home/IntelligenceMetricCards.tsx` | Trusted Retail Sources | Marketing qualify |
| `components/trust/LiveTrustStrip.tsx` | Trusted merchant network | Marketing qualify |
| `components/intelligence/GlobalIntelligencePanel.tsx` | Trusted value, Safest seller | Qualify |
| `app/commerce-intelligence/.../page.tsx` | trusted sellers SEO | Qualify meta |

## Gate Integration Points

| Location | Role |
|----------|------|
| `lib/truth/truthConfidenceGate.ts` | **NEW** — compute truthConfidence, apply verdict gates |
| `lib/intelligence/productionSafetyEngine.ts` | Apply gate in `sanitizeUniversalDecision` |
| `lib/truth/truthLanguagePolicy.ts` | **NEW** — centralized qualified display strings |

## Evidence Sources Today (none qualify as external verification)

| Signal | Actual source |
|--------|---------------|
| Discount verified | Tray median + oldPrice heuristics |
| Merchant verified | `retailTrust.ts` substring list + regex |
| Historical low | localStorage `marketMemory` or tray fallback |
| Best price/deal | Lowest in current SerpApi tray |
| SKU identity | Title regex normalization |

---

## Post-Change Verification Checklist

- [x] Central policy: `lib/truth/truthLanguagePolicy.ts`
- [x] Truth gate: `lib/truth/truthConfidenceGate.ts`
- [x] Integrated in `productionSafetyEngine.sanitizeUniversalDecision`
- [x] `tierToPriorityLabel` returns qualified strings
- [x] Priority labels: LIKELY DEAL SIGNAL / CONFIDENCE-BASED BUY SIGNAL
- [x] Discount labels: Discount Signal taxonomy
- [x] Merchant labels: Seller Trust Signal taxonomy
- [x] Card chips / exposure / brief hero strings updated
- [x] `npm run build` — **PASS**
- [ ] Phase test scripts may need label string updates (separate pass)

## Files Changed (Implementation)

**New**
- `lib/truth/truthLanguagePolicy.ts`
- `lib/truth/truthConfidenceGate.ts`
- `docs/TRUTH_LANGUAGE_POLICY.md`

**Gate integration**
- `lib/intelligence/productionSafetyEngine.ts`
- `lib/intelligence/commerceDecisionCoreEngine.ts`

**User-visible language**
- `lib/ui/intelligenceCardSignals.ts`
- `lib/ui/intelligenceExposureActivation.ts`
- `lib/ui/phase42CommerceIntelligenceCoreActivation.ts`
- `lib/ui/commerceDominanceVerdictEngine.ts`
- `lib/ui/calibratedCommerceVerdictEngine.ts`
- `lib/ui/globalCommerceVerdictEngine.ts`
- `lib/ui/globalCommerceBriefEnrichment.ts`
- `lib/ui/phase39CommerceCalibrationActivation.ts`
- `lib/ui/phase40CommerceRankingActivation.ts`
- `lib/ui/phase43DecisionCalibrationActivation.ts`
- `lib/ui/phase44OpportunityDetectionActivation.ts`
- `lib/ui/phase45ProductionReadinessActivation.ts`
- `lib/intelligence/discountConfidenceEngine.ts`
- `lib/intelligence/realDiscountProofEngine.ts`
- `lib/intelligence/realDiscountValidationV3Engine.ts`
- `lib/intelligence/realMerchantVerificationEngine.ts`
- `lib/intelligence/merchantReliabilityEngine.ts`
- `lib/intelligence/globalPriceIntelligenceEngine.ts`
- `lib/intelligence/discountIntelligenceV2Engine.ts`
- `lib/intelligence/commercePriceHistoryEngine.ts`
- `lib/intelligence/decisionBriefEngine.ts`
- `lib/intelligence/decisionCalibrationEngine.ts`
- `lib/intelligence/globalDecisionReasoningEngine.ts`
- `lib/intelligence/evidenceConfidenceEngine.ts`
- `lib/intelligence/bestPlaceToBuyEngine.ts`
- `components/cosmic/DecisionSnapshotStrip.tsx`
- `components/cosmic/CommandMetricsStrip.tsx`
