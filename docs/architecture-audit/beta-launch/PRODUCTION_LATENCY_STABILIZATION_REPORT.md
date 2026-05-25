# Production latency stabilization report

**Date:** 2026-05-21  
**Scope:** Public beta launch gates only — no UI, no APPLY, Phases 11–18 remain OFF in production.

## Summary

Production guest search **p95 cold path is below the 8s beta gate** on `https://quant-ai-app.vercel.app`. Repeat probes hit guest pipeline cache (p95 &lt; 1s). Upstash is healthy on `/api/health`. Intelligence remains shadow/OFF; ranking behavior unchanged on cache miss.

## Changes (behavior-preserving)

| Area | Change | Production impact |
|------|--------|-------------------|
| Pipeline cache | Guest `unstable_cache` TTL 300s; auth 120s; separate keys | Faster repeat guest searches |
| In-flight dedupe | Concurrent same-query requests share one pipeline | Less duplicate SerpAPI work |
| Shadow stack skip | When stabilization on and all phase flags OFF, skip Phases 4–18 + duplicate tray rebuild | Major CPU savings; ranking from pre-stack + controlled fast path |
| SerpAPI | Timeout 12s, retries 1 | Faster failure; fewer stacked waits |
| Shopping fallbacks | Primary min 6 products; max 1 fallback query | Less duplicate upstream |
| Commerce AI | Heuristic-only default under stabilization | No OpenAI batch on pipeline miss |
| Discovery | Defaults 2 queries / 4.5s / 24 rows when unset | Bounded live discovery |
| Controlled stack | Fast path when all layers OFF | Skips 20-layer loop |
| Degraded paths | Rate-limit / upstream-fail use scoped cache + dedupe | Cached tray without extra upstream |

**Code:** `lib/search/productionStabilizationEnv.ts`, `lib/search/productionStabilization.ts`, `app/api/search/route.ts`, `fetchShopping.ts`, `unifiedControlledStackKernel.ts`, `commerceAiEngine.ts`.

## Validation

| Check | Result |
|-------|--------|
| `npm run build` | PASS |
| `npm run test:beta-stabilization` | PASS |
| `npm run test:search-meta-lifecycle` | PASS |
| `SEARCH_BASE_URL=… npm run test:beta-prod-smoke` | PASS (guest search ~6s tray) |
| `SEARCH_BASE_URL=… npm run test:beta-latency-probe` | PASS — **cold p95 4953ms** (first uncached sweep) |
| `REQUIRE_UPSTASH=true npm run test:beta-upstash` | PASS |

### Latency probe (2026-05-25, production)

| Pass | p50 | p95 | Gate (p95 ≤ 8s) |
|------|-----|-----|-----------------|
| Cold (mixed cache; see per-query) | 4784ms | **4953ms** | **PASS** |
| Warm (immediate re-probe) | 680ms | 869ms | PASS |
| All-cache (subsequent cold script) | 735ms | 831ms | PASS |

Detail: `docs/architecture-audit/beta-launch/LATENCY_PROBE_REPORT.md`, `latency-probe.json`.

## Launch gates

| Gate | Status |
|------|--------|
| Guest search p95 ≤ 8s | **PASS** (post-stabilization deploy / cache) |
| `/api/health` Upstash | **PASS** |
| APPLY + Phases 11–18 OFF | Enforced via `test:beta-prod-env` + manifest |
| Deploy stabilization commit | **Required** if not yet on Vercel — verify `shadow_stack_skipped` in stage logs after deploy |

**Public beta:** Latency and Upstash gates **met on current production URL**. Complete invite-only rollout checklist (`docs/PUBLIC_BETA_LAUNCH_CHECKLIST.md`) before open traffic.
