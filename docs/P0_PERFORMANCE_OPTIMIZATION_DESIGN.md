# QuantAI — P0 Performance Optimization Design  
## Zero Intelligence Loss

**Mode:** Design + proof plan only (Step 8)  
**Status:** NOT IMPLEMENTED  
**Freeze:** Phase A, calibration, merchant diversity, discount authenticity, UI, sale tag — untouched  
**Upstream forensics:** [`SEARCH_LATENCY_FORENSICS.md`](./SEARCH_LATENCY_FORENSICS.md) · Step 6 evidence JSON

---

## 0. Root cause (confirmed)

| Fact | Evidence |
|------|----------|
| Warm wall P50 / P95 | **7860 / 8351 ms** (Step 6) |
| Gap `wallMs − searchLatencyMs` | **p50 ≈ 7742 ms**, **p95 ≈ 7941 ms** |
| Pipeline cache | Working (`searchLatencyMs` often 20–410 ms on warm) |
| OpenAI on warm path | Not (heuristic commerce AI default) |
| Dormant shadow stack (identity→evolution chain) | **Already skipped** in prod beta when flags OFF (`isProductionShadowStackDisabled`) |
| Empty tray warm | **190–248 ms** wall → cost scales with full product tray + always-on post-stamp work |

**Primary 7.5s cause:** Always-on **post-`searchLatencyMs`** work for non-empty trays:

1. `finalizeSearchNormalization`  
2. `applyMerchantDiversitySafeguard` (final pass)  
3. `applySearchIntelligenceUpgrade` → **phases 92–110** (integrity, trust-discount, memory, verdict→fusion)  
4. Ancillary tray meta (`computeMarketAwarenessForTray`, bundles, coherence)  
5. **`await prefetchTruthFoundationBatch`** (Supabase)  
6. **`resolveCanonicalSearchRank`** (Phase A — must remain)  
7. Large `meta` assembly + `composeProductionMeta` + JSON serialization  

**Per-stage millisecond split inside that gap:** **NOT MEASURED** (Step 6 / forensics only have aggregate gap). Any stage duration below is **UNKNOWN** unless noted.

---

## 1. Post-stamp stage inventory

Order in `app/api/search/route.ts` after `const searchLatencyMs = Date.now() - searchStarted` (~L1474).

| Order | Function | File | Sync/Async | Duration | Mutates products | Mutates order | Meta only | Buyer-visible | Required for canonical final |
|------:|----------|------|------------|----------|------------------|---------------|-----------|---------------|------------------------------|
| 1 | `finalizeSearchNormalization` | normalization helpers via route | sync | UNKNOWN | YES (preserve lock) | possible | also meta | CONDITIONAL | YES if APPLY semantics; often identity-preserving under lock |
| 2 | Shadow chain `buildIdentityFoundation`…`buildAutonomousCommerceEvolution` | `lib/intelligence/**` | sync | **0 in prod beta** when skipped | YES if enabled | possible | heavy meta | if enabled | only if flags ON |
| 3 | `applyMerchantDiversitySafeguard` | `lib/search/merchantDiversityRerank.ts` | sync | UNKNOWN | YES | **YES** | no | **YES** | **YES** |
| 4 | `applySearchIntelligenceUpgrade` | search intelligence upgrade | sync | UNKNOWN | YES | possible | meta | **YES** | **YES** (live path) |
| 5 | `applyPhase92TrayIntegrity` | phase92 | sync | UNKNOWN | YES | possible | meta | YES | YES (live) |
| 6 | `applyPhase93TrustDiscountHardening` | phase93 | sync | UNKNOWN | YES | possible | meta | **YES** (discount) | **YES** |
| 7 | `applyPhase95CommerceMemory` | phase95 | sync | UNKNOWN | YES | possible | meta | CONDITIONAL | YES (live) |
| 8 | `applyVerdictIntelligence` | phase10 | sync | UNKNOWN | maybe | maybe | brief/meta | **YES** | YES |
| 9–18 | `applyExplainabilityIntelligence` … `applyDealIntelligence` | phases 101–109 | sync | UNKNOWN each | via brief/products | possible | largely meta+brief | **YES** (brief/copy) | YES for current response contract |
| 19 | `applyCommerceFusion` (phase110) | fusion | sync | UNKNOWN | YES | possible | meta | YES | YES (live) |
| 20 | `computeMarketAwarenessForTray` / `buildBundleSuggestions` / `verifyTrayMetaCoherence` | route helpers | sync | UNKNOWN | NO / maybe | NO | mostly meta | CONDITIONAL | meta contract |
| 21 | `prefetchTruthFoundationBatch` | `lib/truth/truthFoundationLoader.ts` | **async** | UNKNOWN (DB RTT) | NO | NO | prefetch map | indirect | **YES** for truth-assisted Phase A |
| 22 | `resolveCanonicalSearchRank` | `lib/truth/canonicalSearchRank.ts` | sync | ms-scale offline | YES order | **YES** | scores | **YES** | **YES — FREEZE** |
| 23 | `alignDecisionBriefToCanonicalWinner` | route/helpers | sync | UNKNOWN | NO | NO | brief | **YES** | **YES** |
| 24 | Build `data.meta` object (~50+ keys) | `route.ts` | sync | UNKNOWN | NO | NO | YES | partial | YES for API contract |
| 25 | `composeProductionMeta` | `lib/search/productionMetaComposer.ts` | sync | UNKNOWN | NO | NO | trim | lite omit only | YES |
| 26 | `NextResponse.json` / body bytes | Next | sync+NETWORK | scales with ~MB payloads | NO | NO | — | YES | YES |

**Note:** Pre-stamp already ran diversity once; post-stamp runs **`merchant_diversity_final` again** — candidate duplicate (see §2).

---

## 2. Duplicated work analysis

| Pattern | Assessment | Notes |
|---------|------------|-------|
| Pipeline cache vs full response recompute | **DUPLICATE** (architectural) | Warm recomputes all post-stamp intelligence every request |
| Merchant diversity pre-stamp + `merchant_diversity_final` | **DUPLICATE** or **NECESSARY** | UNKNOWN without equality proof if intermediate stages reshuffle |
| `rebuildSearchTrayArtifacts` multiple times | **DUPLICATE** likely | Called around controlled stack and elsewhere |
| Large product field graphs (`qi*`) recomputed/copied through phases | **UNKNOWN** / likely **DUPLICATE** CPU | Needs profiling |
| Truth prefetch every warm hit | **NECESSARY** today for Phase A inputs; **DUPLICATE** across identical warm queries | Cacheable with response or truth memo |
| Meta lite omit | Already reduces some keys in prod | Remaining meta still large |
| JSON serialize of full products+meta every time | **NECESSARY** per response; **DUPLICATE** across identical warm queries | Full-response cache eliminates |
| Shadow stack builders | **NOT** on prod path when skipped | Not the 7.5s |
| Sorting/normalization passes across phases | **UNKNOWN** | Instrument |

---

## 3. Output equivalence contract

### 3.1 Must preserve (identical query + environment + feature flags + market)

For guest (and separately for auth with same entitlement tier):

| Dimension | Rule |
|-----------|------|
| Product identities | Same `link` / id set |
| Product ordering | Exact same orderLinks / grid order |
| Phase A scores / ranking decision records | Exact match (or byte-stable serialize) |
| Merchant diversity outcome | Same top-slot merchant sequence |
| Calibration / buying decisions / labels | Exact match on buyer-visible decision fields |
| Trust / value / discount evidence | Exact match on decision-brief discount notes + verified signals used by UI |
| Availability / truth-influenced rank inputs | Same canonical order given same truth snapshot **or** same cached truth bundle in key |
| Buyer-visible product fields | Deep equal on UI-consumed fields |
| Intelligence flags / versions that affect UI | Exact match |
| Canonical semantic meaning | No “close enough” scores |

### 3.2 Machine-testable strategy

1. **Shadow harness** runs `handleSearch` (or extracted pure pipeline) twice: `current` vs `optimized`.  
2. Compare `canonicalFingerprint(response)`:

**Include (normalized):**
- `products.map(p => ({ link, title, store, price, …buyer fields, qiBuyingDecision, qiVerdict, decision-relevant qi* }))`
- `orderLinks`
- `meta.decisionBrief` (stable fields)
- discount / diversity / Phase A serialize (`truthRankingByLink` scores)
- feature-flag digest + market (`canonicalQuery` market/locale)

**Ignore (volatile allowlist only):**
- `meta.searchLatencyMs`, `latencyBudget.totalMs`, stage timings  
- `ts`, request ids, `Date.now`-derived fields  
- rate-limit counters / circuit telemetry counters that don’t change products  
- `Cache-Control` headers  

3. **Fail closed:** any non-allowlisted deep diff = **FAIL** (no numeric epsilon on scores).

4. Golden corpus: Step 6 / `GOLDEN_DEMO_QUERIES.md` (≥10 queries), empty + sparse + full trays.

---

## 4. Strategy evaluation

### A. Full-response caching after canonical intelligence completion

| | |
|--|--|
| Mechanism | After building final `SearchDataPayload` (+ status), cache **exact canonical body** (or fingerprint+body) keyed by complete intelligence key; warm hits return cached body |
| Potential reduction | **~7–8 s** on warm full trays (gap elimination); empty already fast |
| Semantic risk | **LOW** if key complete + no cross-user leakage; **HIGH** if key incomplete |
| Invalidation | TTL + version/build + flag digest; purge on deploy |
| Files | `route.ts`, new cache module, env TTL, tests |
| Rollback | Flag off → current path |
| **Recommended** | **YES — primary P0** |

### B. Memoization of expensive deterministic post-stamp stages

| | |
|--|--|
| Mechanism | Memo phase92–110 / fusion by tray fingerprint |
| Potential reduction | Large share of gap if CPU-bound; **UNKNOWN** share vs truth/JSON |
| Semantic risk | MEDIUM (fingerprint must include all inputs) |
| Invalidation | Same as A, finer-grained |
| Files | phase modules or route wrapper |
| Rollback | flag |
| **Recommended** | **YES — secondary** if A insufficient on cold or multi-instance |

### C. Avoid duplicate reconstruction / serialization

| | |
|--|--|
| Mechanism | Single tray artifact rebuild; avoid deep clones; reuse buffers |
| Potential reduction | **UNKNOWN** (&lt;1–? s) — needs profiling |
| Semantic risk | LOW–MEDIUM |
| **Recommended** | **YES — P2 after timers** |

### D. Parallelize independent metadata only

| | |
|--|--|
| Mechanism | Overlap truth prefetch with pure meta (not order-mutating phases) |
| Potential reduction | Truth RTT only (**NOT MEASURED**) |
| Semantic risk | MEDIUM if Phase A starts without truth |
| **Recommended** | **CONDITIONAL** — only after timers; never reorder Phase A deps unsafely |

### E. Compute canonical intelligence once and reuse

| | |
|--|--|
| Mechanism | Same as A/B — single compute per key |
| **Recommended** | **YES** (embodied by A) |

### F. Cache post-stamp result keyed by all intelligence inputs

| | |
|--|--|
| Mechanism | Cache post-stamp tray+meta before HTTP envelope; share across guest requests |
| Potential reduction | Same class as A |
| Semantic risk | LOW with full key |
| **Recommended** | **YES** — implementation variant of A |

### G. Defer work with zero buyer-visible effect

| | |
|--|--|
| Mechanism | Drop/defer meta keys never read by UI |
| Potential reduction | UNKNOWN; lite mode already on in production |
| Semantic risk | **HIGH** without UI contract audit — can look like “intelligence loss” in API diligence |
| **Recommended** | **NO as P0** (use only after contract proof). Prefer A for zero-loss |

---

## 5. Full response cache feasibility (safest P0)

### 5.1 Architecture

```
Request
  → auth / rate-limit (uncached per user policy)
  → build CanonicalCacheKey
  → LOOKUP full canonical response cache
       HIT  → return exact cached JSON (volatile fields refreshed optionally)
       MISS → existing frozen pipeline to completion (unchanged semantics)
            → STORE canonical body
            → return
```

**Intelligence compute path on miss = today’s path (reference truth).**  
**Hit path = byte/semantic equivalent prior miss result.**

### 5.2 Required cache-key inputs

| Input | Why |
|-------|-----|
| Normalized query (`normalizeSearchCacheKey` / canonical normalizedQuery) | Tray identity |
| Market: country / language / currency / GL | SerpAPI + ranking |
| Guest vs auth scope | Never mix |
| Auth: `userId` **or** explicit `shared:guest` only for guest | Prevent leakage |
| Entitlement / tier digest | Different product caps / features |
| Feature-flag digest (all intelligence + beta + meta-lite + heuristic AI) | Semantics |
| Pipeline cache version tag (e.g. `quantai-search-pipeline-v56-…`) | Upstream tray version |
| App/build/`intelligenceVersion` | Deploy invalidation |
| Optional: `commerceMemory` / session fingerprint if request carries it | Personalization |
| Optional: controlled-layer / canary session key if enabled | Activation |

**Must NOT** key only on raw query string.

### 5.3 TTL / invalidation

| | Recommendation |
|--|----------------|
| Guest TTL | Start **60–120 s** (align with warm demo; shorter than pipeline 300s if truth freshness matters) |
| Auth TTL | **30–60 s** or user-scoped only |
| Invalidate | Deploy / flag digest change / manual bust env |
| Storage | Prefer shared store (Upstash) for multi-instance; memory OK for single-node shadow proof |
| Stale | Do **not** use cross-query `latestGuestTray` fallback |

### 5.4 Cross-user safety

- Guest cache entries: **no** user memory, **no** auth entitlements beyond guest.  
- Auth entries: **per userId** (or omit full-response cache for auth in v1).  
- Never serve auth-derived trays to guest keys.

### 5.5 Safe?

**CONDITIONAL → YES** if key + scope rules above are enforced and shadow equality passes.

---

## 6. Performance vs intelligence decision

### Can warm P95 ≤ 5 s with **100%** current canonical intelligence output?

**YES — via strategy A (full canonical response cache), as a design conclusion supported by evidence:**

- Warm already pays only ~0.15–0.4 s before stamp.  
- ~7.5 s is **recomputing** the same post-stamp path.  
- Caching the **completed** canonical response preserves intelligence by construction.  
- Empty-tray ~200 ms shows non-intelligence overhead floor.

**Not proven in production until shadow benchmark runs.**

If response cache is forbidden and only “skip stages” is allowed: **UNKNOWN / likely NO** without measuring which always-on phases are buyer-mandatory — skipping them is **not** zero-loss by default.

### Minimum experiment to prove

1. Add **split timers** (shadow only): `postStampCpuMs`, `truthMs`, `serializeMs` — no behavior change.  
2. Implement **shadow full-response cache** behind flag (off in prod).  
3. Run equivalence + latency corpus (§7).  
4. Gate: 100% semantic pass + warm P95 ≤ 5000 ms on corpus.

---

## 7. Shadow benchmark plan

| Item | Spec |
|------|------|
| Environment | Local or staging; **not** production cutover |
| Corpus | Golden demo queries + Step 6 set + empty/sparse |
| Modes | `BASELINE` (current) vs `P0_SHADOW` (response cache on after first fill) |
| Equality | §3 fingerprint deep equal |
| Latency | Per mode: n≥30 warm after fill; report P50/P95/MAX wall + server e2e |
| Fill protocol | First request per key = miss (populate); subsequent = warm hits |
| Pass criteria | 0 semantic diffs; warm P95 ≤ 5000 ms; no cross-key pollution tests |
| Artifacts | JSON report under `docs/architecture-audit/beta-launch/` |

---

## 8. Acquisition safety — REJECT

| Proposal | Mark |
|----------|------|
| Remove/skip Phase A, calibration, diversity, discount gates for speed | **REJECT — VALUE DESTRUCTIVE** |
| Return pipeline tray before phases 92–110 / Phase A as “final” | **REJECT — VALUE DESTRUCTIVE** |
| Cross-context / cross-user cache | **REJECT — VALUE DESTRUCTIVE** |
| Cross-query stale fallback as P0 | **REJECT — VALUE DESTRUCTIVE** |
| Approximate scores / “close” equality | **REJECT — VALUE DESTRUCTIVE** |
| Hide WEAK latency while claiming sub-5s without evidence | **REJECT — VALUE DESTRUCTIVE** |
| Disable truth prefetch permanently without Phase A equivalence proof | **REJECT — VALUE DESTRUCTIVE** |

---

## 9. Recommended architecture (summary)

**P0 (safest zero-loss):** Full **canonical response cache** after frozen pipeline completes, guest-first, strict key, short TTL, flag-gated, shadow-proven.

**P0 companion:** Split latency instrumentation (behavior-neutral).

**P1:** Stage memoization / shared store if multi-instance miss rate high.

**P2:** Clone/serialize dedupe after profiles exist.

**Do not** use “defer intelligence stages” as P0.

### Rollback

`QUANTAI_SEARCH_CANONICAL_RESPONSE_CACHE=off` (default off until proof) → identical to today’s path.

### Files implementation would touch (future only)

| File / area | Role |
|-------------|------|
| `app/api/search/route.ts` | Lookup/store around final response |
| New `lib/search/canonicalResponseCache.ts` (name TBD) | Keying, TTL, get/set |
| `lib/search/productionStabilizationEnv.ts` | Flag/TTL helpers |
| Tests: equivalence harness + latency script | Shadow proof |
| Docs: evidence update | After proof only |

### Acquisition risk

| Risk | Mitigation |
|------|------------|
| Buyer fears “cached dumbed-down AI” | Disclose: cache stores **full** canonical result; miss path unchanged |
| Stale prices within TTL | Short TTL; disclose freshness window |
| Leakage | Guest/auth separation; key audit tests |
| Multi-instance inconsistency | Shared cache or accept per-instance warm |

---

## 10. Evidence-supported latency expectations (design)

| Metric | Baseline (Step 6) | Expected if canonical response cache hits (estimate) |
|--------|-------------------|------------------------------------------------------|
| Warm P50 | 7860 ms | **~500–1500 ms** (auth/limit + cache read + send; floor suggested by empty ~200 ms) |
| Warm P95 | 8351 ms | **~1000–3000 ms** under stable hits — **UNPROVEN** until shadow run |
| Cold / miss | up to ~18 s | Unchanged (still full compute) |

Estimates subtract observed ~7.5 s gap; they are **not** new measurements.

---

## Decision

**Recommended next action:** **IMPLEMENT SHADOW P0** (flag-off by default; harness + optional staging only) — **not** production enablement, **not** sale-tag move.

Until shadow equality + latency gates pass: treat production as **KEEP FROZEN**.
