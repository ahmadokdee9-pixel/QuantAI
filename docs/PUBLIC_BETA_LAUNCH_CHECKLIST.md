# Public beta launch checklist (final)

**Product:** QuantAI — commerce intelligence OS (search-first).  
**Launch mode:** Invite-only public beta (Phase 0 → Phase 1 per `docs/BETA_ROLLOUT_PLAN.md`).  
**Policy:** No APPLY · Phases 11–18 OFF · No new intelligence phases · No UI/architecture changes.

**Production URL:** `https://quant-ai-app.vercel.app` (update if domain changes).

---

## P0 — Launch blockers (must be ☑ before invites)

| # | Item | Owner | How to verify | Status |
|---|------|-------|---------------|--------|
| 1 | Production secrets non-empty | Eng | Vercel Production env vs `docs/PRODUCTION_ENV_MANIFEST.md` | ☐ |
| 2 | APPLY flags false | Eng | `npm run test:beta-prod-env` | ☑ local |
| 3 | Phases 11–18 false | Eng | `npm run test:beta-prod-env` | ☑ local |
| 4 | Upstash on Production | Eng | `REQUIRE_UPSTASH=true SEARCH_BASE_URL=… npm run test:beta-upstash` | ☑ prod health |
| 5 | Supabase migrations applied | Eng | `docs/SUPABASE_PRODUCTION_MIGRATION_CHECKLIST.md` + dashboard | ☐ live probe |
| 6 | `NEXT_PUBLIC_APP_URL` set (Production) | Eng | Vercel env + Stripe redirect smoke | ☐ |
| 7 | Production smoke | Eng | `SEARCH_BASE_URL=… npm run test:beta-prod-smoke` | ☑ |
| 8 | Latency p95 ≤ 8s (guest) | Eng | `SEARCH_BASE_URL=… npm run test:beta-latency-probe` | ⚠ re-probe |
| 9 | Cache + dedupe stable | Eng | `SEARCH_BASE_URL=… npm run test:beta-cache-dedupe` | ☑ |
| 10 | 30-query QA signed off | Product | `docs/PUBLIC_BETA_30_QUERY_QA_EXECUTION.md` | ☐ |
| 11 | SerpAPI/OpenAI spend alerts | Eng | `docs/SERPAPI_OPENAI_COST_ALERTS.md` | ☐ |
| 12 | Build + unit tests | Eng | `npm run build && npm run test` | ☐ CI |
| 13 | Stabilization deployed | Eng | Vercel latest + `shadow_stack_skipped` in logs | ☐ |
| 14 | Rollout + incident + monitoring docs read | Ops | This section links below | ☑ docs |

### One-shot commands

```bash
# Local / CI (no production URL)
npm run build
npm run test
npm run test:public-beta-p0

# Production (replace domain)
set SEARCH_BASE_URL=https://quant-ai-app.vercel.app
npm run test:public-beta-p0:remote
npm run test:beta-cache-dedupe
```

### Operations pack (invite-only beta)

| Document | Purpose |
|----------|---------|
| `docs/PRODUCTION_ROLLOUT_CHECKLIST.md` | Deploy + env + post-deploy verification |
| `docs/INVITE_ONLY_BETA_ROLLOUT.md` | Who gets access, how, comms |
| `docs/PUBLIC_BETA_30_QUERY_QA_EXECUTION.md` | Manual QA execution sheet |
| `docs/BETA_INCIDENT_RESPONSE_CHECKLIST.md` | Sev levels, rollback, comms |
| `docs/PRODUCTION_MONITORING_CHECKLIST.md` | Daily/weekly observability |
| `docs/architecture-audit/beta-launch/BETA_LAUNCH_READINESS_SCORE.md` | Weighted readiness score |

---

## P1 — Before first 100 invitees

- [ ] `QUANTAI_ANALYTICS_SINK_URL` or PostHog wired
- [ ] Legal: privacy, terms, affiliate disclosure live
- [ ] Mobile pass: home → search → save → compare (guest + signed-in)
- [ ] Stripe webhooks verified (if billing enabled for beta)
- [ ] Status page or comms template for SerpAPI outage
- [ ] Support channel (email/Discord) staffed for beta hours

---

## Do not change during invite-only beta

- Intelligence Phases 19+
- UI redesign or card layout changes
- `QUANTAI_*_APPLY=true`, taste/intent production APPLY
- Enabling Phases 11–18 in Production
- Core search architecture rewrite

---

## Production canary (beta values)

| Area | Production beta value |
|------|------------------------|
| Normalization | `ENABLED=true`, `MODE=shadow`, `APPLY=false` |
| Phases 4–18 | OFF (stabilization skips shadow stack when OFF) |
| Commerce AI | `QUANTAI_SEARCH_HEURISTIC_COMMERCE_AI=true` |
| Guest cache | `SEARCH_GUEST_CACHE_SECONDS=300` |

---

## Sign-off (invite-only gate)

| Gate | Status | Date | Signatory |
|------|--------|------|-----------|
| P0 automated (local) | ☑ | | |
| P0 remote smoke + Upstash | ☑ | | |
| P0 remote latency p95 | ⚠ | | Re-run probe; see readiness score |
| P0 cache/dedupe | ☑ | | |
| 30-query QA (≥28/30) | ☐ | | |
| Internal Phase 0 (5–10 users) | ☐ | | |
| **Invite-only public beta** | ☐ | | |

**Verdict:** Invite-only beta is **READY WITH CONDITIONS** — complete latency re-probe, 30-query QA, and Phase 0 internal soak before sending invites. See `docs/architecture-audit/beta-launch/BETA_LAUNCH_READINESS_SCORE.md`.
