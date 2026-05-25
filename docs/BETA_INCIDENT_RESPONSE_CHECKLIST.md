# Beta incident response checklist

Invite-only public beta — use for search outages, auth failures, cost spikes, and ranking regressions. **Do not** enable APPLY or Phases 11–18 as incident mitigation.

---

## Severity definitions

| Sev | Definition | Examples | Response target |
|-----|------------|----------|-----------------|
| **1** | Core broken for most users | Search 5xx &gt;5 min; auth down; data loss | 15 min acknowledge, 1 h mitigate |
| **2** | Degraded but usable | p95 &gt;15s; empty trays &gt;25%; 429 storm | 1 h acknowledge, same day mitigate |
| **3** | Isolated / workaround exists | Single locale sparse; one query bad | Next business day |
| **4** | Cosmetic / meta-only | Shadow telemetry gap | Backlog |

---

## First 10 minutes (any Sev ≥2)

| Step | Action | Owner |
|------|--------|-------|
| 1 | Confirm scope: guest vs signed-in, region, query | On-call |
| 2 | Check `/api/health` — Clerk, Supabase, SerpAPI, OpenAI, Upstash | On-call |
| 3 | Check SerpAPI dashboard + Vercel function errors | On-call |
| 4 | Run smoke: `SEARCH_BASE_URL=… npm run test:beta-prod-smoke` | On-call |
| 5 | Post internal status (Slack/Discord) — no public post until Sev-1 confirmed | Comms |
| 6 | **Pause new invites** if search broken for guests | Ops |

---

## Playbooks

### Search slow or timing out (Sev 2)

| Step | Action |
|------|--------|
| 1 | `npm run test:beta-latency-probe` — record p50/p95 in incident log |
| 2 | `npm run test:beta-cache-dedupe` — if warm pass OK, issue may be cold-path/SerpAPI |
| 3 | Verify `QUANTAI_SEARCH_HEURISTIC_COMMERCE_AI=true` on Production |
| 4 | Verify Phases 4–18 remain OFF (no accidental enable) |
| 5 | If SerpAPI degraded: enable guest cached tray only; comms “results may be delayed” |
| 6 | **Do not** enable APPLY or extra discovery without eng sign-off |

### Search empty tray (Sev 2)

| Step | Action |
|------|--------|
| 1 | Reproduce query in incognito; capture response JSON |
| 2 | Check upstream error in meta / Vercel logs (`upstream_fail`) |
| 3 | Retry after 2 min — guest cache may recover (`upstream_fail_cached_tray`) |
| 4 | If SerpAPI quota: throttle invites; review `docs/SERPAPI_OPENAI_COST_ALERTS.md` |

### Rate limit 429 storm (Sev 2)

| Step | Action |
|------|--------|
| 1 | Confirm Upstash on health (`REQUIRE_UPSTASH=true npm run test:beta-upstash`) |
| 2 | Review guest vs auth limits; check for abuse IP |
| 3 | Temporary: reduce invite batch size; **do not** disable Upstash in prod |

### Auth / saved / compare broken (Sev 1)

| Step | Action |
|------|--------|
| 1 | Clerk status page + env keys on Vercel |
| 2 | Supabase status + RLS migrations (`docs/SUPABASE_PRODUCTION_MIGRATION_CHECKLIST.md`) |
| 3 | Smoke signed-in if `BETA_CLERK_SESSION_COOKIE` available |

### Ranking regression report (Sev 3)

| Step | Action |
|------|--------|
| 1 | Capture query + screenshot + top 10 links |
| 2 | Confirm no APPLY flags flipped (`npm run test:beta-prod-env` on pulled env) |
| 3 | Log for post-beta — **no** hotfix via enabling intelligence phases |

### Cost spike SerpAPI/OpenAI (Sev 2)

| Step | Action |
|------|--------|
| 1 | Dashboards per `docs/SERPAPI_OPENAI_COST_ALERTS.md` |
| 2 | Confirm heuristic commerce AI on Production |
| 3 | Pause marketing/invites; investigate bot traffic |

---

## Rollback procedure

| Order | Action |
|-------|--------|
| 1 | Stop issuing new invite codes / waitlist batch |
| 2 | Vercel → Promote previous **green** deployment |
| 3 | Re-run post-deploy §4 from `docs/PRODUCTION_ROLLOUT_CHECKLIST.md` |
| 4 | If env regression suspected: compare to `docs/PRODUCTION_ENV_MANIFEST.md` (do not bulk-delete vars) |
| 5 | Post-mortem within 48h — attach `LATENCY_PROBE_REPORT.md`, probe timestamps |

**Forbidden rollback “fixes”:** `QUANTAI_*_APPLY=true`, enabling Phases 11–18, UI experiments during incident.

---

## Incident log template

| Field | Value |
|-------|-------|
| Incident ID | |
| Start (UTC) | |
| Severity | |
| Symptom | |
| Impact % users | |
| Root cause | |
| Mitigation | |
| Deploy rollback SHA | |
| Resolved (UTC) | |
| Follow-ups | |

---

## Escalation

| Role | When |
|------|------|
| Eng lead | Sev-1 &gt;30 min or data/security |
| Product | User-facing comms for Sev-1/2 |
| Founder | Cost runaway or legal/privacy |

**External comms (invitees):** Short email/Discord — status, ETA, no technical flag names.
