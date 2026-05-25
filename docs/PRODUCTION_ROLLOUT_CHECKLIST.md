# Production rollout checklist — invite-only beta

Use this for each Production deploy before or during invite-only beta. No feature or UI work — operations only.

**Domain:** `https://quant-ai-app.vercel.app`  
**Env sync:** `npm run env:pull` only (never bare `vercel env pull`). See `docs/ENVIRONMENT.md`.

---

## 1. Pre-deploy (engineering)

| Step | Action | Done |
|------|--------|:----:|
| 1.1 | Branch green: `npm run build` | ☐ |
| 1.2 | Unit guards: `npm run test` | ☐ |
| 1.3 | Beta manifest local: `npm run test:beta-prod-env` | ☐ |
| 1.4 | Stabilization wiring: `npm run test:beta-stabilization` | ☐ |
| 1.5 | Meta lifecycle: `npm run test:search-meta-lifecycle` | ☐ |
| 1.6 | CHANGELOG / release note: stabilization + ops only | ☐ |
| 1.7 | Confirm **no** APPLY or Phase 11–18 enablement in diff | ☐ |

---

## 2. Vercel Production environment

Copy from `docs/PRODUCTION_ENV_MANIFEST.md`. Verify in Vercel dashboard → Production.

| Category | Requirement | Done |
|----------|-------------|:----:|
| Secrets | Clerk, Supabase service role, SerpAPI, OpenAI | ☐ |
| URL | `NEXT_PUBLIC_APP_URL` = production canonical URL | ☐ |
| Rate limit | `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` | ☐ |
| APPLY | All APPLY flags **false** or unset | ☐ |
| Phases 11–18 | All **false** or unset | ☐ |
| Shadow 4–10 | Recommended **false** (latency) | ☐ |
| Normalization | shadow mode, APPLY false | ☐ |
| Stabilization | `QUANTAI_BETA_STABILIZATION` on (default in prod) | ☐ |
| Heuristic AI | `QUANTAI_SEARCH_HEURISTIC_COMMERCE_AI=true` | ☐ |
| Guest cache | `SEARCH_GUEST_CACHE_SECONDS=300` | ☐ |

**Never** push env changes from scripts — Vercel → local sync only.

---

## 3. Deploy

| Step | Action | Done |
|------|--------|:----:|
| 3.1 | Merge to release branch / deploy via Vercel | ☐ |
| 3.2 | Wait for build success | ☐ |
| 3.3 | Note deployment ID / git SHA in rollout log | ☐ |

---

## 4. Post-deploy verification (within 30 min)

```bash
SEARCH_BASE_URL=https://quant-ai-app.vercel.app npm run test:beta-prod-smoke
REQUIRE_UPSTASH=true SEARCH_BASE_URL=https://quant-ai-app.vercel.app npm run test:beta-upstash
SEARCH_BASE_URL=https://quant-ai-app.vercel.app npm run test:beta-cache-dedupe
SEARCH_BASE_URL=https://quant-ai-app.vercel.app npm run test:beta-latency-probe
```

| Check | Pass criteria | Done |
|-------|---------------|:----:|
| `/api/health` | `ok: true`, services configured | ☐ |
| Guest search | ≥2 products, HTTP 200 | ☐ |
| Auth boundaries | saved/compare 401 without session | ☐ |
| Cache | warm hit ≥1.5s faster than cold (same query) | ☐ |
| Dedupe | 3× parallel same query wall &lt; 12s | ☐ |
| Latency | p95 ≤ 8000ms on probe queries | ☐ |

If latency **FAIL**: wait 2 min, re-run probe (cache variance); if still fail, check SerpAPI status and Vercel function logs — do **not** enable APPLY or phases to “fix.”

---

## 5. Supabase (if schema changed)

| Step | Action | Done |
|------|--------|:----:|
| 5.1 | `docs/SUPABASE_PRODUCTION_MIGRATION_CHECKLIST.md` | ☐ |
| 5.2 | `npm run test:beta-supabase-migrations` | ☐ |
| 5.3 | Spot-check saved products / history in dashboard | ☐ |

---

## 6. Go / no-go for invites

| Condition | Required |
|-----------|----------|
| All §4 checks pass | Yes |
| `docs/PUBLIC_BETA_30_QUERY_QA_EXECUTION.md` signed (≥28/30) | Yes |
| `docs/BETA_INCIDENT_RESPONSE_CHECKLIST.md` on-call assigned | Yes |
| `docs/PRODUCTION_MONITORING_CHECKLIST.md` Day-0 sheet started | Yes |

**Rollback:** Vercel → previous deployment; disable new invites (`docs/INVITE_ONLY_BETA_ROLLOUT.md`).

---

## Rollout log (template)

| Field | Value |
|-------|-------|
| Date | |
| Git SHA | |
| Deployer | |
| Smoke | pass / fail |
| Latency p95 | ms |
| Cache/dedupe | pass / fail |
| Invites enabled | yes / no |
