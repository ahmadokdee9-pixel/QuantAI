# Production monitoring checklist — invite-only beta

What to watch daily (Phase 0–1) without new product features. Pair with `docs/SERPAPI_OPENAI_COST_ALERTS.md`.

---

## Day 0 (launch day)

| Check | Tool / command | Target | Done |
|-------|----------------|--------|:----:|
| Health green | `GET /api/health` | `ok: true`, all services true | ☐ |
| Smoke | `npm run test:beta-prod-smoke` | All PASS | ☐ |
| Latency | `npm run test:beta-latency-probe` | p95 ≤ 8000ms | ☐ |
| Cache | `npm run test:beta-cache-dedupe` | speedup ≥1500ms | ☐ |
| APPLY off | `npm run test:beta-prod-env` | All PASS | ☐ |
| Error rate | Vercel Observability | No spike in 5xx on `/api/search` | ☐ |
| SerpAPI credits | SerpAPI dashboard | Within daily budget | ☐ |

---

## Daily (while invites active)

| Metric | Source | Green | Yellow | Red |
|--------|--------|-------|--------|-----|
| Guest search p95 | `test:beta-latency-probe` or analytics | ≤8s | 8–12s | &gt;12s |
| Search 5xx rate | Vercel logs | &lt;0.5% | 0.5–2% | &gt;2% |
| Empty tray rate | Sample 10 golden queries | &lt;10% | 10–20% | &gt;20% |
| 429 rate | Upstash / app logs | &lt;1% | 1–5% | &gt;5% |
| SerpAPI spend | SerpAPI | On budget | +25% | +50% |
| OpenAI spend | OpenAI | On budget | +25% | +50% |
| Auth errors | Clerk dashboard | Flat | Spike | Outage |
| Supabase latency | Supabase | &lt;500ms | 500ms–2s | Errors |

**Action on Yellow:** note in ops log; re-run cache probe.  
**Action on Red:** `docs/BETA_INCIDENT_RESPONSE_CHECKLIST.md` Sev-2/1.

---

## Weekly

| Task | Command / doc |
|------|----------------|
| Re-run 5 golden queries manually | `npm run test:golden-search` |
| Realworld validation sample | `npm run test:realworld` |
| Review invite count vs SerpAPI usage | Rollout log |
| Confirm env drift none | Vercel vs `PRODUCTION_ENV_MANIFEST.md` |
| Latency report archive | `docs/architecture-audit/beta-launch/LATENCY_PROBE_REPORT.md` |

---

## Structured logs to grep (Vercel)

| Event | Meaning |
|-------|---------|
| `upstream_fail` | SerpAPI/shopping upstream error |
| `upstream_fail_cached_recovery` | Served cached tray after upstream fail |
| `guest_rate_limit_cached_tray` | Rate limited but cache hit |
| `shadow_stack_skipped` | Stabilization fast path (expected when phases OFF) |

---

## Dashboards (minimum viable)

| Dashboard | Metrics |
|-----------|---------|
| Vercel | `/api/search` invocations, duration p95, errors |
| SerpAPI | Credits, failed requests |
| Clerk | MAU, sign-in errors |
| Supabase | API errors, connection count |
| Upstash | Command rate, limit hits (if exposed) |

Optional: forward server events to `QUANTAI_ANALYTICS_SINK_URL` when configured.

---

## Alert thresholds (recommended)

| Alert | Condition |
|-------|-----------|
| Search down | 5xx &gt;5% for 5 min |
| Latency | p95 &gt;12s for 15 min (synthetic probe) |
| SerpAPI | 80% daily budget by 18:00 UTC |
| Auth | Clerk incident or error rate 2× baseline |

---

## Monitoring log (template)

| Date | p95 ms | 5xx % | 429 % | SerpAPI $ | Notes |
|------|--------|-------|-------|-----------|-------|
| | | | | | |
