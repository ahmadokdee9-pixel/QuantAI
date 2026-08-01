# QuantAI — Search Latency Forensics

**Mode:** Read-only root-cause analysis (Step 7)  
**Production evidence:** Step 6 — `docs/PRODUCTION_DEMO_EVIDENCE.md` + `docs/architecture-audit/beta-launch/step6-production-evidence.json`  
**Freeze:** No production code / ranking / calibration / diversity / UI changes. No commit/push/deploy.

---

## Executive finding

| Metric (Step 6) | Value |
|-----------------|------:|
| Warm P50 wall-clock | **7860 ms** |
| Warm P95 wall-clock | **8351 ms** |
| Cold P50 / P95 | **8060 / 18212 ms** |
| Classification | **WEAK** |

**Primary bottleneck (warm full trays):** ~**7.5–8.0 s** of work that runs **after** `meta.searchLatencyMs` is stamped — not a SerpAPI pipeline cache miss.

**Evidence (n=30):** `wallMs − searchLatencyMs` gap → **p50 ≈ 7742 ms**, **p95 ≈ 7941 ms**.  
Warm full trays: `searchLatencyMs` typically **20–410 ms** while `wallMs` stays **~7.3–8.4 s**.  
Empty trays (Dyson warm): wall **190–248 ms** — proves product-count / post-pipeline scaling.

**Hypothesis “ranking is the 8 seconds”:** **REJECTED** for warm path — early ranking stages are included in `searchLatencyMs` (~hundreds of ms). The 8s is dominated by **post-stamp local phase stack + truth DB + large JSON**.

---

## 1. Complete `/api/search` execution map

Entry: `GET`/`POST` → `handleSearch` in `app/api/search/route.ts`.

| # | Stage | Source | Class |
|---|-------|--------|-------|
| 1 | HTTP parse / query validation | `route.ts` GET/POST handlers | LOCAL |
| 2 | Query intelligence + cache key | `buildQueryIntelligence`, `normalizeSearchCacheKey` | LOCAL |
| 3 | Auth | `optionalClerkSearchUser` (Clerk) | NETWORK |
| 4 | Subscription tier | `resolveServerSubscriptionTier` | NETWORK / DATABASE |
| 5 | Rate limit | `enforceGuest/AuthSearchLimits` (Upstash or memory) | NETWORK / CACHE |
| 6 | Auth daily quota | `countSearchesTodayUtc` (Supabase) | DATABASE |
| 7 | Start pipeline race | `racePipelineWithStalePrefer` → `loadPipelineWithInflightDedupe` → `unstable_cache` | CACHE / NETWORK |
| 8 | Buyer-signal builders (overlap pipeline) | taste / intent / ranking prep (sync) | LOCAL |
| 9 | Await pipeline tray | SerpAPI + discovery + enrich + commerce AI/heuristic | EXTERNAL API / AI / LOCAL / CACHE |
| 10 | Post-pipeline rank A (pre-stamp) | predictive → persona → market → identity → semantic → quality → buying → diversity → controlled stack | LOCAL |
| 11 | **Stamp `searchLatencyMs`** | `Date.now() - searchStarted` (~L1474) | — |
| 12 | Normalization final + optional shadow stack | `finalizeSearchNormalization`, dormant builders if flags on | LOCAL |
| 13 | Merchant diversity (again) + phases 92–110 + fusion | `applyMerchantDiversitySafeguard`, `applySearchIntelligenceUpgrade`, phase92–95, verdict, commerce fusion, etc. | LOCAL |
| 14 | Truth foundation prefetch | `prefetchTruthFoundationBatch` (Supabase ×3 parallel) | DATABASE |
| 15 | Phase A canonical rank | `resolveCanonicalSearchRank` | LOCAL (+ truth inputs) |
| 16 | Meta compose + JSON serialize | `composeProductionMeta`, `NextResponse.json` | SERIALIZATION |
| 17 | Network download to client | TLS / body transfer | NETWORK |

### Cached pipeline only (`runSearchPipeline`, cache miss)

```
applyBetaDiscoveryDefaults
→ await fetchShoppingProductsWithFallback     // SerpAPI (+ optional sequential fallback)
→ await runSafeLiveCommerceDiscovery          // SerpAPI discovery (primaries parallel)
→ enrichProductsWithIntelligence              // LOCAL
→ await attachCommerceAiLayer                 // heuristic (default) OR OpenAI
→ buildDealClusters / buildSearchIntelligence // LOCAL
```

---

## 2. Network-bound operations

| CALL | SOURCE | PURPOSE | SEQ/PAR | TIMEOUT | RETRY | CACHE | BLOCKS RESPONSE |
|------|--------|---------|---------|---------|-------|-------|-----------------|
| Clerk `auth` / `currentUser` | `route.ts` | Identity | SEQ | Clerk default | none | session | YES |
| Supabase tier resolve | subscription helpers | Plan | SEQ | none explicit | none | none | YES (auth) |
| Upstash / memory rate limit | `lib/rate-limit.ts` | Abuse | SEQ | RTT | none | Redis counters | YES if 429 |
| Supabase search count | `persistence.ts` | Daily quota | SEQ (auth) | none | none | none | YES |
| SerpAPI shopping | `fetchShopping.ts` | Listings | SEQ in pipeline; in-flight dedupe | beta **9000 ms** | beta **1** | inside pipeline `unstable_cache` | YES on miss |
| SerpAPI fallback query | `fetchShoppingProductsWithFallback` | Sparse recovery if &lt;6 products | SEQ after primary | same | same | none | YES on miss |
| SerpAPI live discovery | `liveCommerceDiscovery` / market refresh | Merchant breadth | primaries **PAR** (max 2); fallbacks SEQ | beta **3000 ms** | default **0** | pipeline cache | YES on miss |
| OpenAI commerce batch | `attachCommerceAiLayer` | AI commerce | SEQ in pipeline | default **3500 ms** | null→heuristic | 12 min memory | YES on miss **only if heuristic off** |
| Supabase truth prefetch | `truthFoundationLoader.ts` | Availability + price history | **3 queries PAR** | none | none | none | YES (successful trays) |
| Search history write | persistence | Memory | fire-and-forget | — | — | — | NO |

---

## 3. Parallelization opportunities (not implemented)

| ID | A / B / C | Current dependency | True dependency | Risk | Semantics affected |
|----|-----------|--------------------|-----------------|------|--------------------|
| P-A | Truth prefetch vs phases 92–110 | Truth starts late, then await before Phase A | Prefetch only needs product links; can overlap phase CPU | MEDIUM | NO if Phase A still waits for truth before final order |
| P-B | Auth rate-limit ∥ daily count | Sequential awaits | Independent reads | LOW | NO |
| P-C | Cap/defer fat meta builders | Sequential sync | UI may not need all meta for first paint | MEDIUM | Possibly YES if clients require fields |
| P-D | Guest final-tray response cache | Always recompute post-pipeline | Guest identical key → same tray | MEDIUM | YES if user-specific memory leaks into key |
| P-E | Parallel ordered ranking stages | Shared tray mutation / `trayOrderLock` | Often ordered by design | HIGH | **YES** — do not parallelize ordered rank |

---

## 4. Cache forensics

| CACHE | KEY | TTL | HIT | MISS | STALE | Upstream bypass on hit? | Ranking recomputed? | Potential saving |
|-------|-----|-----|-----|------|-------|-------------------------|---------------------|------------------|
| Guest pipeline `unstable_cache` | tag `quantai-search-pipeline-v56-…` + `guest-pipeline` + normalized query | **300s** (60–900) | Skip SerpAPI+discovery+AI | Full upstream | — | YES | Post-cache stages always | Cold SerpAPI seconds |
| Auth pipeline cache | `auth-pipeline` + key | **120s** | same | same | — | YES | always | same |
| In-flight pipeline Map | `guest\|auth:pipelineKey` | request | coalesce | — | — | — | — | thundering herd |
| Shopping fetch dedupe | market+upstreamQuery | in-flight | coalesce SerpAPI | — | — | — | — | duplicate SerpAPI |
| Guest stale tray | pipelineKey (+ risky latest fallback) | **15 min** memory | stale-prefer / recovery | — | prefer **3500 ms** | serves snapshot | uses snapshot rank | cold rescue only |
| Commerce AI memory | fingerprint | 12 min process | skip OpenAI | — | — | — | — | OpenAI only |
| HTTP `Cache-Control` | — | s-maxage 90 | limited (`private`) | — | — | — | — | marginal |

### Why Step 6 warm P50 stayed ~7.86 s

1. **Pipeline cache WAS hitting** for most warm repeats (`searchLatencyMs` ≪ wall).  
2. Cache wraps **only** `runSearchPipeline` — not phases 92–110, truth, Phase A final, or JSON.  
3. Warm benchmark therefore measured **post-pipeline cost**, not “warm SerpAPI.”  
4. `servedStale: false` on evidence rows — stale-prefer did not short-circuit.  
5. Empty trays (~200 ms) confirm: when post-pipeline product work collapses, wall collapses.

**Answer:** Warm requests **did** hit the intended **pipeline** cache; they did **not** hit any **end-to-end response** cache (because none exists for the full decision payload).

---

## 5. External provider bottleneck

| Path | Role |
|------|------|
| Typical warm | SerpAPI **bypassed** (pipeline cache) → provider contribution to wall ≈ **0** for those samples |
| Cold miss / sparse recovery | SerpAPI + optional fallback + discovery — can dominate `searchLatencyMs` |
| Step 6 cold outliers | `gaming laptop` `searchLatencyMs=10373`; `Dyson V15` `searchLatencyMs=17656` (0 products) — **provider/pipeline miss cost** |

Exact per-call SerpAPI RTT breakdown in production logs: **NOT MEASURED** this session (only aggregate `searchLatencyMs` + wall).

Structure: primary shopping **single** (with in-flight dedupe) → optional **sequential** fallback → discovery **up to 2 parallel** primaries.

---

## 6. AI / OpenAI on critical path

| Question | Answer |
|----------|--------|
| On default beta search path? | **NO** — `QUANTAI_SEARCH_HEURISTIC_COMMERCE_AI` defaults **true** → heuristic-only |
| If heuristic off + key present? | **YES** — one batch OpenAI call inside cached pipeline, timeout ~3500 ms, blocks tray on miss |
| Required before response? | Only when OpenAI path active; heuristic always local |
| Deterministic Phase A depends on OpenAI? | **NO** (Phase A is local truth/rank after tray exists) |

Health `openai: true` means credential present, **not** that OpenAI ran on Step 6 searches.

---

## 7. Local compute cost

| Bucket | Warm full-tray evidence |
|--------|-------------------------|
| UPSTREAM WAIT | Small (`searchLatencyMs` tens–hundreds ms) |
| LOCAL INTELLIGENCE (pre-stamp) | Included in `searchLatencyMs` — not the 8s |
| LOCAL INTELLIGENCE (post-stamp phases 92–110+) | **Dominant unexplained ~7.5s** with products |
| DATABASE (truth prefetch) | On critical path after phases; size scales with ≤36 products — **NOT MEASURED** alone |
| CACHE | Working for pipeline |
| SERIALIZATION | Large `meta` + products JSON — contributes; empty trays prove payload/phase coupling |

**Ranking/calibration as sole cause of 8s:** **NO** (pre-stamp).  
**Post-stamp intelligence + DB + serialize as cause:** **YES** (strongly evidenced by gap + empty-tray contrast). Exact split phase-vs-DB-vs-JSON: **NOT MEASURED** (needs finer timers).

---

## 8. Benchmark design audit

| Question | Finding |
|----------|---------|
| Truly cold/warm? | “Cold” pass often already pipeline-warm (`searchLatencyMs` low). True cold = high `searchLatencyMs` outliers. |
| Identical query strings? | YES (repeated golden queries) |
| Cache keys match? | YES for normalized guest pipeline keys |
| Serverless cold start? | Possible additive; **NOT ISOLATED**; empty warm ~200ms argues not the main 8s |
| Rate limiting? | No 429s in Step 6 sample |
| Upstream cache? | Affects cold miss only |
| Wall-clock correct? | YES (client start→JSON complete) |
| Fallback/stale mixed? | `servedStale: false`; empty trays mixed into warm stats (Dyson) — improves warm average slightly |
| Flaw | Using wall-only “warm” **overstates** upstream failure; understates post-pipeline cost. `searchLatencyMs` **understates** buyer latency. |
| Flaw | Concurrent/batch probing may stress guest cache (iPhone/MacBook anomaly in demo pass) |

---

## 9. Target latency budget (design only — not implemented)

**Targets:** Warm P50 ≤ **3 s** · Warm P95 ≤ **5 s**

| Stage | Current evidence | Target budget | Optimization opportunity | Risk | Requires product-code change? |
|-------|------------------|---------------|--------------------------|------|-------------------------------|
| Auth / rate limit | tens–hundreds ms (est.) | ≤150 ms | parallelize auth reads | LOW | YES |
| Pipeline (warm hit) | `searchLatencyMs` ~20–400 ms | ≤400 ms | keep | LOW | NO |
| Pipeline (cold miss) | up to ~10–18 s | ≤6–8 s disclosed | timeouts already set; provider SLA | MED | maybe |
| Pre-stamp rank/calibration | inside `searchLatencyMs` | ≤300 ms | leave frozen | — | NO (freeze) |
| Post-stamp phases 92–110 | ~majority of ~7.5 s gap | ≤1500 ms | defer/skip non-UI; feature-gate | MED–HIGH | YES |
| Truth prefetch | unknown share of gap | ≤400 ms overlapped | start earlier; soft-timeout | MED | YES |
| Phase A canonical | ms–tens ms offline | ≤100 ms | leave | — | NO (freeze) |
| Meta + JSON | unknown share | ≤400 ms | lite meta / trim | MED | YES |
| Client RTT | tens–hundreds | ≤200 ms | CDN | LOW | NO |
| **Warm total** | **P50 7860 / P95 8351** | **P50 ≤3000 / P95 ≤5000** | cut post-stamp path | — | YES for P0 |

---

## 10. Prioritized optimization plan (do not implement)

### P0 — likely >3 s saving

| Field | Content |
|-------|---------|
| **CHANGE** | Cut or defer **post-`searchLatencyMs` always-on phase stack** (92–110 / fusion / redundant rebuilds) for default guest search when UI already has decision brief + products; keep Phase A + calibration authorities |
| **EXPECTED MECHANISM** | Remove ~majority of 7.5 s gap on full trays |
| **ESTIMATED SAVING** | **4–7 s** warm wall (range; needs timers) |
| **RISK TO INTELLIGENCE** | MEDIUM — must prove UI does not depend on deferred meta |
| **FILES** | `app/api/search/route.ts`, possibly phase appliers, `productionMetaComposer.ts` |
| **TESTS** | Phase A, calibration, Phase4, merchant diversity, P0, golden demo probes, payload contract tests |
| **ROLLBACK** | Feature flag restore full stack |

| Field | Content |
|-------|---------|
| **CHANGE** | Instrument split timers: `pipelineMs`, `postPipelineCpuMs`, `truthMs`, `serializeMs`, end-to-end server ms (fix misleading budget) |
| **EXPECTED MECHANISM** | Prove next cut; diligence honesty |
| **ESTIMATED SAVING** | 0 s user-facing; enables safe P0 |
| **RISK** | LOW |
| **FILES** | `route.ts`, latency budget helpers |
| **TESTS** | unit on timer fields; probe asserts both metrics |
| **ROLLBACK** | revert telemetry |

| Field | Content |
|-------|---------|
| **CHANGE** | Overlap truth prefetch with post-stamp CPU; soft-timeout truth before Phase A with safe empty prefetch |
| **EXPECTED MECHANISM** | Hide DB RTT behind CPU |
| **ESTIMATED SAVING** | **0.3–2 s** (UNKNOWN exact) |
| **RISK** | MEDIUM to truth-assisted rank if timeout too aggressive |
| **FILES** | `route.ts`, `truthFoundationLoader.ts` |
| **TESTS** | Phase A authority, truth record integrity |
| **ROLLBACK** | flag disable overlap / restore await order |

### P1 — likely 1–3 s

- Guest **final response tray** short TTL cache (pipelineKey + freeze version) — **1–6 s** if safe; risk MEDIUM (stale decisions).  
- Aggressive meta lite / strip unused `qi*` blobs for guest — **0.5–2 s** serialize+CPU.  
- Assert heuristic commerce AI in prod health (prevent accidental OpenAI on path) — prevents regressions.

### P2 — &lt;1 s

- Parallel auth quota + rate limit.  
- Shared Redis stale tray (replace process memory) for prefer path.  
- Minor builder memoization.

### P3 — marginal / not worth sale risk

- Micro-optimizing Phase A / calibration kernels (already ms).  
- More SerpAPI parallelism (cost + ToS + diversity risk).  
- UI redesign for “perceived speed” only.

---

## 11. Acquisition value guard — REJECT

| Idea | Mark |
|------|------|
| Skip `resolveCanonicalSearchRank` / serve pre-Phase-A order as final | **REJECT — VALUE DESTRUCTIVE** |
| Disable calibration / merchant diversity for speed | **REJECT — VALUE DESTRUCTIVE** |
| Return SerpAPI raw listings before identity/truth gates while claiming QuantAI decisions | **REJECT — VALUE DESTRUCTIVE** |
| Cross-query `latestGuestTray` fallback as primary speed hack | **REJECT — VALUE DESTRUCTIVE** (cross-talk risk) |
| Fabricate products / fake cache hits for demos | **REJECT — VALUE DESTRUCTIVE** |
| Cache auth trays under guest keys | **REJECT — VALUE DESTRUCTIVE** |
| Parallelize ordered ranking mutations ignoring `trayOrderLock` | **REJECT — VALUE DESTRUCTIVE** |
| Claim warm P95 ≤5s from `searchLatencyMs` alone | **REJECT — VALUE DESTRUCTIVE** (misleading diligence) |

---

## Realistic path to warm P95 ≤ 5 s

**UNKNOWN → leaning YES** if post-stamp phase stack is safely deferred/slimmed **without** touching Phase A / calibration / diversity semantics, **and** truth+JSON are bounded.  

**NO** if the only allowed changes are ranking/calibration freezes with no route restructuring — current architecture recomputes a large post-cache intelligence surface every request.

SerpAPI optimization alone **cannot** fix warm P50 (~pipeline already cached).

---

## Recommended action (forensics conclusion)

**KEEP FROZEN** until an explicitly approved P0 that:

1. Adds split latency instrumentation, then  
2. Feature-flags deferral of non-authority post-stamp phases / meta,

with full acquisition gates green and buyer disclosure updated.

Do **not** implement in this step.
