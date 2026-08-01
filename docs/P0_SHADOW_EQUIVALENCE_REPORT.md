# QuantAI — Shadow P0 Equivalence Report

**Step:** 9 — Shadow canonical response cache + zero-loss proof  
**Mode:** Local / shadow only — **NOT production-enabled**  
**Feature flag:** `QUANTAI_SEARCH_CANONICAL_RESPONSE_CACHE` — **DEFAULT OFF**  
**TTL:** `QUANTAI_SEARCH_CANONICAL_RESPONSE_CACHE_TTL_SECONDS` default **60s** (shadow freshness; miss = full frozen pipeline)

---

## 1. Architecture

```
Request
  → validate + auth + rate-limit (always)
  → if flag ON and not degraded: LOOKUP canonical response cache
       HIT  → return prior completed body (+ volatile stamp)
       MISS → EXISTING FULL PIPELINE (phases 92–110, Phase A, calibration path, diversity, truth, meta)
            → STORE completed success body
            → return
```

**MISS path = today’s frozen QuantAI pipeline.** No stages removed.

| Piece | Location |
|-------|----------|
| Cache module | `lib/search/canonicalResponseCache.ts` |
| Integration | `app/api/search/route.ts` (narrow HIT before pipeline; STORE before success return) |
| Harness | `scripts/test-shadow-p0-canonical-cache.mjs` |
| Live focused | `scripts/shadow-p0-live-focused.mjs` |
| Artifacts | `docs/architecture-audit/beta-launch/shadow-p0-equivalence.json`, `shadow-p0-live-focused.json` |

---

## 2. Cache boundary

- **Only** after canonical success body `{ success: true, data }` is fully built.  
- Errors / 429 / empty fail paths are **not** stored as canonical hits.  
- Process memory store (shadow). Multi-instance shared store **not** implemented (limitation).

---

## 3. Cache key

SHA-256 over material including:

- schema `crc-v1`
- normalized query
- auth scope `guest|auth`
- hashed user fingerprint (auth only; never email)
- tier
- market country / currency / language
- sort mode (default `value`)
- hashed session/`commerceMemory` fingerprint when present
- feature-flag digest
- `intelligenceVersion` (13)
- pipeline cache tag (`TASTE_GRAMMAR_PIPELINE_CACHE_KEY`)

Keys are opaque `crc:crc-v1:<hex>` — **no secrets/tokens in key strings**.

---

## 4. TTL

**60 seconds** default (clamp 5–300).

Why short: product/price freshness; shadow experiment; expired entry → automatic full MISS path.

---

## 5. Isolation strategy

Proven in module tests:

| Test | Result |
|------|--------|
| Different queries | PASS |
| Guest vs auth | PASS |
| Different market/currency | PASS |
| Different session fingerprint | PASS |
| Different sort mode | PASS |
| TTL expiry → miss | PASS |
| Malformed set rejected | PASS |
| Unavailable → miss | PASS |

---

## 6. Volatile-field allowlist

Stripped for equality only (not intelligence):

- `searchLatencyMs`, `latencyMs`, `latencyBudget`
- `stageSuppression`, `reliability`, `pipelineTrace`, `searchDebug`
- `canonicalResponseCache` diagnostics
- `ts`, `generatedAt`, `recordedAt`, `requestId`, `retryAfter`

**Not ignored:** products, order, scores, buying decisions, decision brief core, discount evidence, merchant fields, ranking records.

---

## 7. Corpus

Module synthetic corpus (7): laptop, phone, TV, furniture, audio, footwear, sparse.

Live local server (`next start -p 3011`, flag ON): Step 6 categories; rate-limit noise observed on some pairs.

---

## 8. Equivalence results

### Module (deterministic)

| Metric | Value |
|--------|------:|
| Corpus size | 7 |
| Comparisons (A↔B↔C) | 21 |
| Semantic mismatches | **0** |
| Isolation | **PASS** |

### Live true HIT pairs (`X-QuantAI-Canonical-Cache: HIT`)

| Query | MISS ms | HIT ms | Equal |
|-------|--------:|-------:|-------|
| iPhone 15 Pro 256GB (focused run) | 7317 | **46** | **YES** |
| Earlier harness true HITs (sofa/XM5/iPhone) | ~10s | **27–51** | **YES** |

`allTrueHitsEqual: true` on focused run for `hitHeader === HIT`.

### Live contaminated pairs

Some second requests lacked HIT header (guest rate-limit / degraded path bypasses response-cache lookup). Those are **not** counted as cache HITs. Diffs were operational (`operationalState`, `fallbackReason`), not product-order changes on true HIT samples.

---

## 9. Latency results

### Module store/get (compute excluded)

| | P50 | P95 | Max |
|--|----:|----:|----:|
| MISS store | ~0–1 ms | ~1 ms | 1 ms |
| HIT get | ~0 ms | ~1 ms | 1 ms |

### Live wall-clock (local `next start`, flag ON)

**Canonical MISS (focused 4 queries):**

| | ms |
|--|---:|
| P50 | 7145 |
| P95 | 10679 |
| MAX | 10679 |

**True CACHE HIT only (focused):**

| | ms |
|--|---:|
| P50 | **46** |
| P95 | **46** |
| MAX | **46** |
| n | 2 |

**Measured P95 improvement (true HIT vs MISS P95):** 10679 → 46 ms ≈ **99.6%** reduction on HIT path.  
**Measured P50 improvement:** 7145 → 46 ms ≈ **99.4%**.

---

## 10. Validation gates

| Gate | Result |
|------|--------|
| `npm run build` | PASS |
| `npx tsc --noEmit` | PASS |
| Phase A | PASS 11/11 |
| Calibration | PASS 17/17 |
| Phase 4 | PASS 23/23 |
| Merchant diversity | PASS |
| P0 production readiness | PASS |
| Shadow module harness | PASS |

---

## 11. Privacy / secret audit

| Check | Result |
|-------|--------|
| Cache keys hashed / no raw secrets | PASS |
| No tokens/JWTs/emails in keys | PASS |
| Values = API JSON already returned to client | PASS (same as response body) |
| Flag default OFF | PASS |

---

## 12. Rollback

Unset or set `QUANTAI_SEARCH_CANONICAL_RESPONSE_CACHE=false` → identical to pre-P0 frozen pipeline. No migration.

---

## 13. Known limitations

1. **In-memory only** — not shared across serverless instances.  
2. **Guest rate-limit / degraded paths** can skip response-cache lookup (`!guestOperationalDegraded` gate).  
3. Live corpus-wide HIT rate incomplete under abuse limits during dense probing.  
4. Auth contextual live matrix not fully exercised (guest-focused live).  
5. Production enablement **not** done.

---

## 14. Verdict for Step 9

| Question | Answer |
|----------|--------|
| Shadow implementation completed | **YES** |
| MISS path preserved | **YES** |
| Intelligence stages removed | **NO** |
| Module zero-loss A≡B≡C | **YES** |
| Live true-HIT zero-loss | **YES** (observed) |
| Warm P95 ≤ 5s on true HIT | **YES** (46 ms) |
| Production-ready promote | **MORE EVIDENCE REQUIRED** (shared cache, rate-limit interaction, larger clean HIT sample, auth matrix) |

**Recommended decision:** **MORE EVIDENCE REQUIRED** before production promote; shadow P0 is **technically validated** for HIT equality + latency.
