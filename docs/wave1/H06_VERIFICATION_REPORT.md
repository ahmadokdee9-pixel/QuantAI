# H-06 Verification Report

**Date:** 2026-08-05  
**Scope:** H-06 only (guest capacity / stale tray messaging)  
**Result:** **PASS**  
**Rollback used:** No  
**Rollback tag:** `rollback-h06-20260805-235424` @ `e5cf1fa`  
**Commit:** `9f44f9f`  
**Deployment:** https://www.quantaihq.com  
**H-02…H-07 (except H-06):** Untouched  

---

## Root cause

1. Guest soft limits (especially Upstash hourly, hardcoded `12/h`) tripped under mild burst.
2. When limited, warm guest pipeline cache was still served with `guest_rate_limit_*_cached_tray` + capacity banner (“guest capacity recovers / slightly stale”), even though this is a normal cache serve — not true stale degradation.
3. Guest burst lived in per-instance memory (ineffective/racy on serverless); Upstash hourly ignored `GUEST_SEARCH_HOURLY_MAX`.

---

## Files changed

| File | Change |
|------|--------|
| `lib/search/searchAbuseProtection.ts` | `decideGuestRateLimitServe`; higher defaults; shared burst enforce |
| `lib/rate-limit.ts` | Env-tuned Upstash guest hourly + burst limiters |
| `app/api/search/route.ts` | Warm cache under limit → clean serve (no capacity banner) |
| `.env.example` | Document new guest defaults |
| `scripts/test-h06-guest-capacity.mjs` | Regression |
| `scripts/qa-independent-h06.mjs` | Independent QA |

---

## Tests added

- `npx tsx scripts/test-h06-guest-capacity.mjs` — policy + wiring contracts.

Local gates: ESLint (touched) PASS · `tsc --noEmit` PASS · `npm run build` PASS · H-06 regression PASS.

---

## Production evidence

### Pre-fix (reproduce)

Parallel ×16 `AirPods Pro 2`: **15/16** capacity hits (`guest_rate_limit_*_cached_tray`).

### Post-fix

| Probe | Capacity hits | Products |
|-------|---------------|----------|
| Sequential ×10 | **0/10** | 12 each |
| Parallel ×16 | **0/16** | 12 each |

---

## Independent QA

- Script: `scripts/qa-independent-h06.mjs`
- Evidence: `docs/wave1/H06_INDEPENDENT_QA.json`
- Verdict: **PASS** — capacityHits 0/16 · productOk 16/16 · Dyson control 18 · Critical hostile 400
- No unrelated regression → no rollback

---

## Launch Board

| Item | Action |
|------|--------|
| H-06 | **Removed** (independently verified) |
| Remaining High | **5** |
| Next (approval required) | **H-02** |
| PB-01 | Remains open (full economic envelope beyond H-06) |
