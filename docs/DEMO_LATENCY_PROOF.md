# QuantAI — Demo latency & reliability proof

**Purpose:** Acquisition diligence — evidence that buyer demos are protected against slow SerpAPI / live enrichment **without** changing Phase A ranking, labels, merchant diversity, or discount authenticity.  
**Sprint:** Acquisition Prep Sprint 1  
**Code changes in Sprint 1:** None required — stale-prefer and timeouts already shipped.

---

## Mechanisms already in production code (verified by source review)

| Mechanism | Location | Behavior |
|-----------|----------|----------|
| Beta stabilization defaults | `lib/search/productionStabilizationEnv.ts` → `applyBetaDiscoveryDefaults` | In production / when stabilization on: discovery timeout ~3s, SerpAPI timeout ~9s, request timeout ~10s, heuristic commerce AI, guest cache TTL extended |
| **Stale-tray prefer** | `racePipelineWithStalePrefer` + `QUANTAI_SEARCH_STALE_PREFER_MS` (default **3500**) | If a prior guest tray exists and live pipeline is slow, serve stale tray after prefer window instead of waiting full timeout |
| Wired in search route | `app/api/search/route.ts` | Guest path races live loader vs stale seed; sets operational reason `stale_tray_preferred_over_slow_live` when stale wins |
| In-flight dedupe + Next cache | `loadPipelineWithInflightDedupe`, guest/auth `unstable_cache` | Duplicate concurrent queries share one upstream fetch |
| Circuit breaker + timeouts | `lib/search/searchReliabilityGuardrails.ts` | Opens after repeated failures; `withTimeout` on pipeline |
| Offline unit proof of race | `scripts/benchmark-search-speed-path.mjs` | Asserts slow live → `servedStale: true` |

**Preserved by design:** Final product order still comes from Phase A canonical rank on the **tray that is returned**. Stale prefer returns a previously ranked tray snapshot — it does not invent a new ranking algorithm.

---

## Offline evidence (available without production credentials)

Run:

```bash
npx --yes tsx scripts/benchmark-search-speed-path.mjs
```

Expected qualitative result (from Sprint 1 re-run or prior stabilization work):

- Fast live loader → `servedStale: false`  
- Slow live loader (> prefer ms) with stale present → `servedStale: true`  
- Prefer ms configurable via `QUANTAI_SEARCH_STALE_PREFER_MS`

**Ranking integrity after recovery:** Covered by existing gates (not re-implemented here):

```bash
npm run test:phase-a-rank-authority
npm run test:phase-a-decision-calibration
npm run test:phase4-ranking-validation
npm run test:merchant-diversity
```

These gates must stay green; Sprint 1 does not alter them.

---

## Production / staging measurements — SELLER MUST RUN

Live p50/p95 **cannot be invented**. Seller (or buyer staging) must record numbers against a deployed URL with real `SERPAPI_KEY`.

### Commands

```powershell
# Cold-ish pass (default queries)
$env:SEARCH_BASE_URL="https://YOUR_PRODUCTION_OR_STAGING_HOST"
npm run test:beta-latency-probe

# Warm pass (second hit per query)
$env:SEARCH_BASE_URL="https://YOUR_PRODUCTION_OR_STAGING_HOST"
$env:BETA_PROBE_WARM="true"
npm run test:beta-latency-probe

# Broader remote P0 (smoke + cache + latency + upstash if configured)
$env:SEARCH_BASE_URL="https://YOUR_PRODUCTION_OR_STAGING_HOST"
npm run test:public-beta-p0:remote
```

Optional query override:

```powershell
$env:BETA_LATENCY_QUERIES="iphone 15 pro,macbook pro,oled tv 55,corner sofa,sony wh-1000xm5"
```

Probe writes artifacts under `docs/architecture-audit/beta-launch/` when run successfully.

### Record table (fill after probe — leave blank until measured)

| Scenario | p50 (ms) | p95 (ms) | Notes / date / host |
|----------|----------|----------|---------------------|
| Cold guest search | _pending seller run_ | _pending seller run_ | |
| Warm guest search | _pending seller run_ | _pending seller run_ | |
| Stale-prefer observed (`meta.operationalState` / degraded reason) | _pending_ | _pending_ | Look for `stale_tray_preferred_over_slow_live` or stale recovery reasons |

### Discovery timeout behavior (documented, not re-measured here)

When live discovery exceeds `DISCOVERY_TIMEOUT_MS` (beta default ~3000ms), pipeline falls back to internal SerpAPI tray rather than hanging indefinitely — see `lib/intelligence/liveCommerceDiscovery.ts` + stabilization defaults.

---

## What not to claim in diligence

- Guaranteed sub-second search  
- That stale prefer replaces SerpAPI (first visit still needs upstream)  
- That in-memory stale tray is multi-region durable (serverless instance memory)  
- Invented latency numbers in this file  

---

## Demo operator guidance

1. Warm staging with 2–3 golden queries before buyer call (`docs/GOLDEN_DEMO_QUERIES.md`).  
2. Prefer guest search on warm host so cache + stale path can engage.  
3. If SerpAPI is down, say so — do not improvise fake products.  
4. Keep dormant intelligence flags **OFF**.
