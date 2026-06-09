# QuantAI Truth Language Policy (Phase 1A)

**Authority:** `lib/truth/truthLanguagePolicy.ts`  
**Gates:** `lib/truth/truthConfidenceGate.ts`  
**Enforcement:** `lib/intelligence/productionSafetyEngine.ts` → `applyTruthGateToDecision()`

## Rule

QuantAI must **never** imply external verification, historical market validation, market-wide certainty, merchant certification, or factual proof unless a dedicated Truth Layer evidence source asserts it.

Until Phase 1B–1D (Price History, Merchant Trust API, SKU Identity, Discount Verification), all signals are **search-sample and heuristic**.

## Forbidden user-facing phrases (without truth gate pass)

- Verified Discount / Strong Verified Discount / Real Discount
- Best Deal Found / Best Price Found (universe-wide implication)
- Marketplace Verified / Verified Seller / Trusted Seller / Trust verified
- Historical Low (without ≥3 remembered price snapshots)
- Elite Merchant (as certification)

## Approved replacements

| Legacy | Qualified |
|--------|-----------|
| Verified Discount | Discount Signal |
| Best Deal Found | Likely Deal Signal |
| BUY READY (priority) | Confidence-Based Buy Signal |
| Best Price Found | Market Sample Lowest Observed |
| Trusted Seller | Seller Trust Signal |
| Historical Low | Observed Price Floor Signal |
| Elite Merchant | High Trust Signal Seller |

## Truth confidence thresholds

| Gate | Minimum `truthConfidence` |
|------|---------------------------|
| BUY READY / Confidence-Based Buy Signal | 0.65 |
| STRONG BUY | 0.72 |
| BEST DEAL / Likely Deal Signal | 0.80 |
| Verified-class labels | 0.70 |

If thresholds are not met:
- Downgrade tier (BEST DEAL → STRONG BUY → BUY READY → COMPARE)
- If `truthConfidence < 0.35` → **INSUFFICIENT DATA** + WAIT tier
- If `0.35–0.65` on buy tiers → **COMPARE**

## Evidence inputs (Phase 1A — no external APIs)

- Price history sample count (localStorage `marketMemory`)
- SKU identity confidence (title normalization)
- Search-sample market coverage score
- Discount proof score (heuristic, capped)
- Merchant trust score (curated prior, capped)
- Listing price presence

## Review

Use `findTruthLanguageViolations(text)` from `truthLanguagePolicy.ts` in reviews and tests.
