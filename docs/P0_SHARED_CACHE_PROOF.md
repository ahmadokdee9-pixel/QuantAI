# QuantAI — P0 Shared Durable Cache Proof (Step 11)

**Purpose:** Prove multi-worker / shared-client HIT semantics for the shadow canonical response cache without changing ranking or intelligence.  
**Flag default:** `QUANTAI_SEARCH_CANONICAL_RESPONSE_CACHE` = **OFF**  
**Sale tag:** untouched (`quantai-sale-candidate-v1`)  
**Production deploy:** not performed  
**Commit / push:** not performed  

Artifacts:
- `docs/architecture-audit/beta-launch/shadow-p0-shared-cache-proof.json`
- `docs/architecture-audit/beta-launch/shadow-p0-shared-cache-live.json`
- Harness: `scripts/shadow-p0-shared-cache-proof.mjs` (+ `scripts/shadow-p0-shared-cache-worker.mjs`)

---

## 1. Infrastructure audit

| Item | Finding |
|------|---------|
| Existing Redis/Upstash | `@upstash/redis` already used in `lib/rate-limit.ts` (`quantai:search*`, `quantai:copilot*`, …) |
| Env wiring | `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` (same as rate-limit) |
| Shared client helper | `lib/redis/upstashClient.ts` (soft-null when unset) |
| Namespace | `quantai:crc:v1:<sha256(logicalKey)>` — isolated from rate-limit prefixes |
| TTL | Redis `EX` / file `expiresAtMs` / memory `expiresAtMs` (bounded 5–300s; default 60s) |
| Serialization | JSON envelope `{ v:1, storedAtMs, body }` + `success===true` + `data` object validation |
| Deployment | Upstash REST is serverless-compatible (same as production rate limits) |
| Guest/auth isolation | Key material includes `authScope` + opaque hashed user fingerprint (never raw user id / tokens) |
| Failure behavior | Any backend error → null → canonical MISS (full frozen pipeline) |
| Multi-instance | Upstash shared across workers; local proof used durable **file** store when Upstash env absent |

**Decision:** Reuse existing Upstash infrastructure for production-grade shared cache. Do **not** add a new Redis vendor. Local multi-process proof uses `QUANTAI_CRC_BACKEND=file` when Upstash credentials are unavailable.

---

## 2. Implementation (shadow / default OFF)

| Piece | Location |
|-------|----------|
| Cache module (async get/set, backends) | `lib/search/canonicalResponseCache.ts` |
| Upstash client | `lib/redis/upstashClient.ts` |
| Route HIT / STORE | `app/api/search/route.ts` (await get/set; MISS unchanged) |
| Backend select | Auto: Upstash if env present → else memory. Override: `QUANTAI_CRC_BACKEND=upstash\|file\|memory` |
| Header | `X-QuantAI-Canonical-Cache: HIT\|MISS` |
| Diagnostics | `data.meta.canonicalResponseCache.backend` (volatile; excluded from equivalence) |

MISS path remains today’s exact frozen pipeline (no intelligence bypass).

---

## 3. Module / shared-store proof

| Check | Result |
|-------|--------|
| Corpus | 12 queries · **36** equivalence comparisons · **0** semantic mismatches |
| Product identity / order / scores / merchant diversity / buying / buyer-visible | **ALL PASS** |
| Guest / auth / cross-user isolation | PASS |
| TTL expiry → MISS | PASS |
| Malformed set / malformed value → MISS | PASS |
| Backend unavailable / soft-fail → MISS | PASS |
| Key collision resistance (pipeline tag) | PASS |
| Sequential MISS→HIT | PASS |
| Concurrent warm HIT ratio | **24/24 = 100%** |
| Cross-process shared client (file writer process → reader process → parent) | **PASS** |
| Memory control (child cannot see parent memory) | PASS (proves why Step 10 concurrent failed) |
| Secret scan on evidence JSON | PASS |

---

## 4. Live proof (local `next start` :3013)

Env (process only; not default):
- `QUANTAI_SEARCH_CANONICAL_RESPONSE_CACHE=true`
- `QUANTAI_CRC_BACKEND=file`
- Elevated guest caps for shadow only

| Item | Result |
|------|--------|
| Sequential true HIT | **8/8** (`X-QuantAI-Canonical-Cache: HIT`, backend=`file`) |
| Intelligence-slice equality | **8/8** |
| Concurrent warm (`Promise.all` × 4 warmed queries) | **4/4 HIT**, ratio **100%** |
| Backend on HIT meta | `file` |

### True MISS wall-clock (n=6 first-pass MISS only)

| Metric | ms |
|--------|---:|
| P50 | **8336** |
| P95 | **10778** |
| MAX | **10778** |

(Warm first-probes that returned HIT from prior manual warm were excluded from MISS stats.)

### True HIT wall-clock (n=8)

| Metric | ms |
|--------|---:|
| P50 | **84** |
| P95 | **150** |
| MAX | **150** |

**Measured P95 improvement (true MISS→HIT):** 10778 → 150 ms ≈ **98.6%**

---

## 5. Validation gates

| Gate | Result |
|------|--------|
| Build | PASS |
| TypeScript (`tsc --noEmit`) | PASS |
| Phase A | PASS |
| Calibration | PASS |
| Phase 4 | PASS |
| Merchant diversity | PASS |
| P0 | PASS |
| Shadow P0 module | PASS |

---

## 6. Remaining production caveat

Local `.env.local` does **not** contain `UPSTASH_REDIS_*` (Vercel interactive login required for `npm run env:pull`).  

Therefore:
- **Shared durable multi-worker semantics are proven** via the file backend + independent processes + live concurrent HITs.
- **Upstash REST path is implemented and selected automatically when credentials exist**, but was **not** live-exercised in this session against a real Upstash database.

Production already uses Upstash for rate limits; CRC keys are namespaced separately (`quantai:crc:v1:`).

---

## 7. Promotion readiness

| Question | Answer |
|----------|--------|
| ZERO-LOSS (MISS vs HIT semantics) | **YES** (module + live slice equality) |
| MULTI-WORKER / shared durable proven | **YES** (file shared store + concurrent live HITs) |
| Production Upstash live proof | **PENDING** (credentials not available locally this session) |
| Feature flag default | **OFF** |
| Safe to flip ON in production | **Not yet** — run one Upstash-backed shadow soak on staging/prod with flag ON in a single preview first |

**PRODUCTION PROMOTION VERDICT: MORE EVIDENCE REQUIRED**  
(Need Upstash-credentialed multi-instance HIT confirmation before recommending default-OFF → selective enablement.)
