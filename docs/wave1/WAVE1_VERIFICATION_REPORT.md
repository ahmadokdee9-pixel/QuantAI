# Wave 1 Verification Report

**Gate:** Public Beta blockers PB-02 + PB-10  
**Result:** **PASS — production healthy**  
**Wave 2:** **LOCKED** (no execution)  
**Rollback:** Not required  

## Checkpoints

| Item | Value |
|------|--------|
| Rollback tag | `rollback-wave1-20260805-110454` @ `64a9e9b` |
| Baseline deploy tag | `deploy-wave1-baseline-20260805-110454` |
| Deploy tag | `deploy-wave1-20260805-110454` |
| Ship commit | `5b26e30` |
| Production deploy | `dpl_8UabDVaebW9uS6HNVcNJ3WeKNYRJ` READY |
| Alias | https://www.quantaihq.com |

## Baseline metrics (pre-change)

| Metric | Value |
|--------|--------|
| Health latency | 381 ms |
| Search latency | 9507 ms (16 products) |
| Homepage raw bytes | 87,597 |
| Error rate | not instrumented (pre PB-10) |
| Build time (local post-change) | 62.2 s |
| `.next/static` | 4,088,420 bytes |
| Largest CSS chunk | 586.1 KB |
| Largest JS chunk | 1614.5 KB |

## Post-deploy metrics

| Metric | Value |
|--------|--------|
| Search latency | 11,764 ms (26 products) |
| Health | `ready=true`, `rateLimit.backend=upstash`, `shared=true`, `compliant=true` |
| Ops hour snapshot | `search_ok≥1`, `search_empty=0`, `upstream_cost≥1`, `api_5xx=0` |
| Lighthouse performance | **0.39** · LCP 9.9 s · TBT 1240 ms · CLS 0.027 (mobile/headless) |

Note: Lighthouse score is a baseline for Wave 4 (PB-09), not a Wave 1 failure criterion.

## Verification checklist

| Check | Result |
|-------|--------|
| Build | PASS |
| Types (`tsc --noEmit`) | PASS |
| Lint (touched files) | PASS |
| Tests (`test:beta-upstash` + REQUIRE_UPSTASH) | PASS |
| Production health | PASS |
| Search | PASS (26 / smoke 21 products) |
| Decision engine | PASS (classify flight; hotel/flight/subscription run) |
| Billing unaffected | PASS (`/api/billing/subscription` → 401, not 5xx) |
| Authentication unaffected | PASS (`/dashboard` Clerk protect-rewrite) |
| Smoke production release | PASS (green) |
| Rollback triggered | **NO** |

## What shipped

### PB-02 — Shared production rate-limit store
- Production (`VERCEL_ENV=production`) **fail-closed** if Upstash missing — no silent in-memory fallback
- Upstash errors in Production also fail-closed
- `/api/health` exposes `rateLimit.{backend,shared,productionStrict,compliant}` + `ready`

### PB-10 — Production observability
- Structured `ops.signal` logs + Upstash hour counters: `search_ok`, `search_empty`, `api_5xx`, `upstream_cost`, `rate_limit`
- `/api/health.ops` exposes empty-search rate and cost proxy within minutes

## Open board after Wave 1

**10 blockers remain.** PB-02 and PB-10 deleted forever from `LAUNCH_BOARD.md`.

**Next:** Wave 2 (PB-01) — locked until explicit approval.
