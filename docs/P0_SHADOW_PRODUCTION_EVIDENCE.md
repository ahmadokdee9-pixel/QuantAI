# QuantAI — P0 Shadow Production-Grade Evidence (Step 10)

**Purpose:** Expand shadow proof to a GO / NO-GO quality bar for production promotion.  
**Flag default:** `QUANTAI_SEARCH_CANONICAL_RESPONSE_CACHE` = **OFF**  
**Sale tag:** untouched  
**Production deploy:** not performed  

Artifacts:
- `docs/architecture-audit/beta-launch/shadow-p0-production-evidence.json`
- Harness: `scripts/shadow-p0-production-evidence.mjs`

---

## 1. What was tested

### Module (in-process, no network)

| Item | Result |
|------|--------|
| Corpus size | **25** queries (categories: laptop/phone/TV/furniture/audio/footwear/appliance/ebook/toys/sports/sparse/empty + variants + repeat) |
| Equivalence comparisons | **75** (A↔B↔C per item) |
| Semantic mismatches | **0** |
| Product identity / order / scores / diversity / buying / buyer-visible | **ALL PASS** |
| Guest/auth + multi-user isolation | PASS |
| Market/currency/persona/flag/pipeline-tag isolation | PASS |
| TTL expiry → MISS | PASS |
| Malformed / unavailable → fail-safe MISS | PASS |
| Concurrent identical reads (20) | PASS |
| Concurrent different keys | PASS |
| Cross-user leakage | PASS |

### Live local server (flag ON only in process env; not default)

| Item | Result |
|------|--------|
| Base | `http://127.0.0.1:3012` |
| Guest caps raised for shadow only | hourly 500 / daily 1000 / burst 120 |
| Live corpus | **16** diverse queries |
| True HIT count (`X-QuantAI-Canonical-Cache: HIT`) | **16 / 16** |
| Intelligence-slice equality on true HIT | **16 / 16** |
| MISS sample count | **16** |
| HIT sample count (true HIT, 2 samples each) | **32** |

### Validation gates (re-run)

Build PASS · tsc PASS · Phase A PASS · Calibration PASS · Phase 4 PASS · Merchant diversity PASS · P0 PASS · Step 9 shadow module PASS  

Secret/privacy scan on evidence JSON: **PASS** (no keys/JWTs/tokens)

---

## 2. Latency (live wall-clock)

### MISS (n=16)

| Metric | ms |
|--------|---:|
| P50 | **7700** |
| P95 | **11670** |
| MAX | **11670** |
| MIN | 3530 |
| Average | 8376 |

Outliers: denser/cold-ish misses up to ~11.7s (`iPhone 15`, `AirPods Pro 2`, etc.). Empty/sparse misses can be faster (~3.5s).

### HIT true-only (n=32)

| Metric | ms |
|--------|---:|
| P50 | **48** |
| P95 | **459** |
| MAX | **707** |
| MIN | 11 |
| Average | 126 |

**Measured P95 improvement (MISS→HIT):** 11670 → 459 ms ≈ **96.1%**  
**Measured P50 improvement:** 7700 → 48 ms ≈ **99.4%**

Unfavorable HIT outliers still ≪ 5s (max 707 ms).

---

## 3. Concurrent live request observation

After sequential warm, four previously HIT queries were issued in `Promise.all`:

| Result | Value |
|--------|--------|
| allHit | **false** |
| headers | all `MISS` |
| latencies | ~8.6–11.0 s each |

**Interpretation:** Under concurrent load, in-memory cache did not serve HITs (likely multi-worker / process isolation for `next start`, or race with request handling). This is a **production blocker** for horizontally scaled Node/Vercel until a **shared** cache store is implemented and re-proven.

Sequential single-flight HIT path remains strongly proven.

---

## 4. Rate-limit interaction

With elevated shadow-only guest caps, sequential corpus achieved **100% true HIT**.  
Without elevated caps (Step 9), degraded/rate-limit paths skipped response-cache lookup.  
**Production implication:** enablement must respect abuse limits; cache must not bypass rate limits (current design does not).

---

## 5. Auth live matrix

Module: guest vs auth vs user1 vs user2 isolation **PASS**.  
Live: guest-focused only (no Clerk session cookies in harness).  
**Remaining:** authenticated live MISS→HIT matrix still thin.

---

## 6. Failure fallback

| Case | Result |
|------|--------|
| Flag OFF | Full frozen pipeline (default) |
| TTL expiry | MISS |
| Malformed set | rejected; MISS |
| Cache unavailable | MISS |
| Live success-only store | errors not cached as HIT |

---

## 7. Production promotion decision

| Criterion | Status |
|-----------|--------|
| Zero-loss sequential HIT | **MET** |
| Broad corpus | **MET** (25 module + 16 live) |
| HIT P95 ≤ 5s | **MET** (459 ms) |
| Isolation / privacy | **MET** (module) |
| Concurrent / multi-worker HIT | **NOT MET** |
| Shared durable cache | **NOT IMPLEMENTED** |
| Auth live matrix | **PARTIAL** |

### PRODUCTION PROMOTION VERDICT: **MORE EVIDENCE REQUIRED**

**Exact remaining blocker:**  
Implement and shadow-prove a **shared** canonical response cache backend (e.g. Upstash) so concurrent / multi-instance HIT behavior matches sequential proof; then re-run concurrent + multi-instance evidence. Optionally add authenticated live MISS→HIT pairs.

Until then: keep flag **DEFAULT OFF**; do not promote to production.

---

## 8. Freeze / hygiene

| Item | Status |
|------|--------|
| Production code changed in Step 10 | **NO** (harness/docs only) |
| Feature flag default | **OFF** |
| Deploy | **NO** |
| Commit / push | **NO** (pending approval) |
| Sale tag modified | **NO** |
| Intelligence stages removed | **NO** |
| Canonical MISS path | **PRESERVED** |
