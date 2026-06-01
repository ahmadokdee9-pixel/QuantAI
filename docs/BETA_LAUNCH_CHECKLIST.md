# Invite-only beta launch checklist

**Product:** QuantAI — Commerce Intelligence OS (search-first).  
**Launch mode:** Controlled invite-only beta (Phase 0 internal soak → Phase 1 invites).  
**Constraints:** No APPLY · Phases 11–18 OFF · No UI redesign · No new intelligence phases.

**Production URL (update if changed):** `https://quant-ai-app.vercel.app`

**Companion docs:**

| Document | Use |
|----------|-----|
| `docs/PRODUCTION_ENV_CHECKLIST.md` | Per-provider env audit |
| `docs/PRODUCTION_ENV_MANIFEST.md` | Vercel copy-paste env block |
| `docs/COST_MONITORING.md` | SerpAPI/OpenAI alerts + emergency shutdown |
| `docs/PUBLIC_BETA_LAUNCH_CHECKLIST.md` | Extended P0 table + sign-off history |
| `docs/BETA_INCIDENT_RESPONSE_CHECKLIST.md` | Sev levels + playbooks |
| `docs/INVITE_ONLY_BETA_ROLLOUT.md` | Who gets access + comms |

---

## Phase 0 — Internal soak (5–10 users, no public invites)

Complete **before** widening to invite list.

| # | Gate | Verify | Status |
|---|------|--------|--------|
| 0.1 | Production deploy green | Vercel latest deployment succeeded | ☐ |
| 0.2 | Env manifest | `npm run test:beta-prod-env` (local mirrors prod values) | ☐ |
| 0.3 | Remote smoke | `SEARCH_BASE_URL=… npm run test:beta-prod-smoke` | ☐ |
| 0.4 | Save / watchlist / search feedback | Manual: save, remove, watchlist, error banners | ☐ |
| 0.5 | Guest rate limits felt | 429 copy institutional; not silent failure | ☐ |
| 0.6 | Legal pages live | `/legal/privacy`, `/legal/terms`, `/legal/ai-disclaimer`, `/contact` | ☐ |
| 0.7 | `trust@quantai.app` monitored | Inbox staffed for beta window | ☐ |
| 0.8 | Incident doc read | `docs/BETA_INCIDENT_RESPONSE_CHECKLIST.md` | ☐ |

**Exit criteria:** No Sev-1 issues for 48h; internal team signs Phase 0 row below.

---

## Phase 1 — Invite-only beta (controlled cohort)

### A. Environment & platform (P0)

| # | Item | How to verify | Status |
|---|------|---------------|--------|
| 1 | All required secrets in Vercel Production | `docs/PRODUCTION_ENV_CHECKLIST.md` §1–7 | ☐ |
| 2 | APPLY flags false | `npm run test:beta-prod-env` | ☐ |
| 3 | Phases 11–18 false | `npm run test:beta-prod-env` | ☐ |
| 4 | `NEXT_PUBLIC_APP_URL` HTTPS canonical | Stripe redirect + sitemap spot-check | ☐ |
| 5 | Upstash on Production | `REQUIRE_UPSTASH=true SEARCH_BASE_URL=… npm run test:beta-upstash` | ☐ |
| 6 | Supabase migrations | `npm run test:beta-supabase-migrations` + dashboard | ☐ |
| 7 | Stabilization env deployed | `QUANTAI_SEARCH_HEURISTIC_COMMERCE_AI=true`, guest cache 300s | ☐ |
| 8 | Health endpoint green | `GET /api/health` — clerk, supabase, serpapi, openai, redis | ☐ |

### B. Quality & performance (P0)

| # | Item | How to verify | Status |
|---|------|---------------|--------|
| 9 | Build + tests | `npm run build && npm run test` | ☐ |
| 10 | P0 automated pack | `npm run test:public-beta-p0` | ☐ |
| 11 | Remote P0 pack | `npm run test:public-beta-p0:remote` | ☐ |
| 12 | Latency p95 ≤ 8s (guest) | `npm run test:beta-latency-probe` | ☐ |
| 13 | Cache + dedupe | `npm run test:beta-cache-dedupe` | ☐ |
| 14 | 30-query QA ≥ 28/30 | `docs/PUBLIC_BETA_30_QUERY_QA_EXECUTION.md` | ☐ |

### C. Cost & abuse (P0)

| # | Item | How to verify | Status |
|---|------|---------------|--------|
| 15 | SerpAPI quota alerts | 70% / 90% — `docs/COST_MONITORING.md` | ☐ |
| 16 | OpenAI budget cap | Monthly cap + email — `docs/COST_MONITORING.md` | ☐ |
| 17 | Guest search caps active | Defaults or `GUEST_SEARCH_*` in Production | ☐ |
| 18 | Daily usage monitoring owner | Named on-call + dashboard bookmarks | ☐ |
| 19 | Emergency shutdown doc read | `docs/COST_MONITORING.md` § Emergency | ☐ |

### D. Trust & ops (P0)

| # | Item | How to verify | Status |
|---|------|---------------|--------|
| 20 | Privacy, Terms, AI disclaimer | No placeholders; footer links work | ☐ |
| 21 | Rollout plan agreed | `docs/INVITE_ONLY_BETA_ROLLOUT.md` | ☐ |
| 22 | Incident + cost runbooks | This doc + `BETA_INCIDENT_RESPONSE` + `COST_MONITORING` | ☐ |
| 23 | Log drain (optional P1) | Vercel → Axiom/Datadog for `upstream_fail` | ☐ |

---

## One-shot command block

```bash
# Local / CI
npm run build
npm run test
npm run test:public-beta-p0

# Production (PowerShell — set your domain)
$env:SEARCH_BASE_URL="https://quant-ai-app.vercel.app"
npm run test:public-beta-p0:remote
```

---

## P1 — Before first 100 invitees

- [ ] `QUANTAI_ANALYTICS_SINK_URL` or product analytics wired
- [ ] Stripe webhooks verified (if billing enabled)
- [ ] Mobile pass: home → search → save → compare (guest + signed-in)
- [ ] Status comms template for SerpAPI outage
- [ ] Support channel staffed for beta hours

---

## Do not change during invite-only beta

- `QUANTAI_*_APPLY=true` or taste/intent production APPLY
- Enabling Phases 11–18 in Production
- UI redesign or search ranking architecture rewrite
- New intelligence phases (19+)
- Bare `vercel env pull` (use `npm run env:pull`)

---

## Sign-off

| Gate | Status | Date | Signatory |
|------|--------|------|-----------|
| Phase 0 internal soak | ☐ | | |
| Production env (§ A) | ☐ | | |
| Remote automated (§ B) | ☐ | | |
| Cost monitoring (§ C) | ☐ | | |
| Trust & ops (§ D) | ☐ | | |
| **Invite-only beta GO** | ☐ | | |

**Current verdict template:** Complete ☐ items above. Codebase P0 scripts pass locally; production gates (env sign-off, 30-query QA, spend alerts, Phase 0 soak) remain operator-owned.

**When all P0 rows are ☑:** Send invites per `docs/INVITE_ONLY_BETA_ROLLOUT.md`.
