# Public beta launch checklist

**Product:** QuantAI commerce intelligence OS (search-first, not a store).  
**Policy:** No APPLY · Phases 11–18 OFF · No new intelligence phases for beta.

**Readiness score target:** Complete all **P0** items below.

---

## P0 — Launch blockers

| # | Item | How to verify | Doc / command |
|---|------|---------------|---------------|
| 1 | Production secrets non-empty | Vercel Production env | `docs/PRODUCTION_ENV_MANIFEST.md` |
| 2 | APPLY flags false | Manifest + script | `npm run test:beta-prod-env` |
| 3 | Phases 11–18 false | Manifest | `npm run test:beta-prod-env` |
| 4 | Upstash on Production | Health + script | `docs/UPSTASH_RATE_LIMIT_VERIFICATION.md`, `npm run test:beta-upstash` |
| 5 | Supabase migrations applied | Dashboard + script | `docs/SUPABASE_PRODUCTION_MIGRATION_CHECKLIST.md`, `npm run test:beta-supabase-migrations` |
| 6 | `NEXT_PUBLIC_APP_URL` set | Stripe/sitemap | Manual |
| 7 | Production smoke | Automated | `SEARCH_BASE_URL=... npm run test:beta-prod-smoke` |
| 8 | Latency p95 gate | Automated | `SEARCH_BASE_URL=... npm run test:beta-latency-probe` |
| 9 | 30-query QA | Manual sign-off | `docs/PUBLIC_BETA_30_QUERY_QA.md` |
| 10 | SerpAPI/OpenAI alerts | Dashboard | `docs/SERPAPI_OPENAI_COST_ALERTS.md` |
| 11 | Build + unit CI | Local/CI | `npm run build && npm run test` |
| 12 | Rollout plan acknowledged | Team | `docs/BETA_ROLLOUT_PLAN.md` |

### One-shot P0 bundle

```bash
npm run build
npm run test
npm run test:public-beta-p0
SEARCH_BASE_URL=https://YOUR_PRODUCTION_DOMAIN npm run test:public-beta-p0:remote
```

---

## P1 — Before first 100 users

- [ ] `QUANTAI_ANALYTICS_SINK_URL` or PostHog wired
- [ ] Legal: privacy, terms, affiliate disclosure
- [ ] Mobile device pass (home → search → save → compare)
- [ ] Stripe webhooks (if billing on)
- [ ] Status comms for SerpAPI outage

---

## Do not change before beta

- Intelligence Phases 19+
- UI redesign
- `QUANTAI_*_APPLY=true` or taste/intent production APPLY
- Enabling Phases 11–18 in Production
- Core `app/api/search/route.ts` refactor

---

## Canary (beta)

| Flag | Production beta value |
|------|------------------------|
| Normalization | `ENABLED=true`, `MODE=shadow`, `APPLY=false` |
| Controlled activation | OFF |
| Commerce brain 11–18 | OFF |

---

## Sign-off

| Gate | Status | Date |
|------|--------|------|
| P0 automated (`test:public-beta-p0`) | ☐ | |
| P0 remote smoke + latency | ☐ | |
| 30-query QA | ☐ | |
| Internal 5–10 users complete | ☐ | |
| **Public beta invite** | ☐ | |

**Verdict:** Public beta is **BLOCKED** until all P0 rows are checked and remote probes pass.
