# Cost monitoring — SerpAPI, OpenAI, and emergency controls

**Scope:** Invite-only public beta cost containment.  
**Policy:** Prefer throttling and cache over new product features. **Do not** enable APPLY or Phases 11–18 to reduce cost.

**Related:** `docs/SERPAPI_OPENAI_COST_ALERTS.md` (quick reference) · `docs/PRODUCTION_ENV_CHECKLIST.md` · `docs/BETA_INCIDENT_RESPONSE_CHECKLIST.md`

---

## 1. Cost surfaces

| Provider | Primary triggers | Code paths |
|----------|------------------|------------|
| **SerpAPI** | Guest + auth search, live discovery, fallbacks | `POST /api/search`, `lib/intelligence/liveMarketRefresh.ts` |
| **OpenAI** | Compare verdict, copilot, commerce AI batch (when not heuristic) | `/api/search/compare-verdict`, `/api/copilot/chat`, `/api/ai-chat`, commerce batch |

**Built-in guards (no extra deploy):**

- Guest: burst 4/min, hourly 12, daily 20 (`GUEST_SEARCH_*`)
- Auth: burst 18/min + hourly Upstash window
- Guest cache 300s / auth 120s (`SEARCH_*_CACHE_SECONDS`)
- Beta: `QUANTAI_SEARCH_HEURISTIC_COMMERCE_AI=true` skips most OpenAI on search path
- Query max length 220 (`SEARCH_QUERY_MAX_LENGTH`)

---

## 2. SerpAPI spend alerts

### Dashboard setup

| Step | Action |
|------|--------|
| 1 | Open [serpapi.com/manage-api-key](https://serpapi.com/manage-api-key) |
| 2 | Confirm plan supports **projected daily searches** (table below) |
| 3 | Enable email notifications at **70%** and **90%** of monthly quota |
| 4 | Add secondary owner email (backup on-call) |

### Volume planning (beta)

| Cohort | Assumption | SerpAPI calls / day (order of magnitude) |
|--------|------------|------------------------------------------|
| Phase 0 (10 users) | 5 searches each | ~50 |
| Invite 100 | 10 searches / user / day | ~1,000 |
| Invite 1000 | Same ratio | ~10,000 |

Add **30% headroom** for cache misses, cold path, and compare-adjacent discovery.

### Failure modes

| Signal | Meaning | Action |
|--------|---------|--------|
| `/api/health` `serpapi: false` | Key missing/invalid | Fix `SERPAPI_KEY` in Vercel |
| Search 503 / empty tray | Quota or upstream | See § Emergency shutdown |
| `upstream_fail` in Vercel logs | SerpAPI timeout/error | Check SerpAPI status; reduce invites |
| 429 to users | Rate limits working | Expected under abuse — do not disable Upstash |

### Daily SerpAPI sanity (2 min)

```bash
SEARCH_BASE_URL=https://YOUR_DOMAIN npm run test:beta-prod-smoke
```

Optional: note SerpAPI dashboard “searches today” at same time each day (spreadsheet or Slack pin).

---

## 3. OpenAI spend alerts

### Dashboard setup

| Step | Action |
|------|--------|
| 1 | [platform.openai.com/usage](https://platform.openai.com/usage) |
| 2 | Set **monthly budget** hard cap with email notification |
| 3 | Suggested beta caps: **$50–100/mo** (100 invitees), **$25/mo** (Phase 0) |
| 4 | Restrict API key to QuantAI project only (rotate if leaked) |

### Model env (optional)

| Variable | Default | Use |
|----------|---------|-----|
| `QUANTAI_COMMERCE_AI_MODEL` | `gpt-4.1-mini` | Search commerce batch |
| `QUANTAI_COPILOT_MODEL` | code default | Copilot |
| `QUANTAI_COMMERCE_AI_TIMEOUT_MS` | `3500` | Caps batch latency/cost |

### Failure modes

| Signal | Meaning | Action |
|--------|---------|--------|
| Compare 503 | OpenAI error or cap | Check usage dashboard |
| Build fails on deploy | Missing `OPENAI_API_KEY` | Set Production key |
| Usage spike | Compare or copilot abuse | Tighten auth limits; see emergency |

**Production beta default:** keep `QUANTAI_SEARCH_HEURISTIC_COMMERCE_AI=true` so search path avoids batch OpenAI.

---

## 4. Daily usage monitoring (15 min routine)

**Owner:** Named on-call (rotate weekly).  
**Time:** Same UTC window daily (e.g. 09:00 UTC).

| Check | Source | Pass criteria |
|-------|--------|---------------|
| SerpAPI % quota | SerpAPI dashboard | &lt; 70% mid-month; investigate if &gt; 90% |
| OpenAI spend | OpenAI usage | Within monthly cap; no spike &gt; 2× 7-day avg |
| Search health | `GET /api/health` | `serpapi`, `openai`, `redis` true |
| Smoke | `npm run test:beta-prod-smoke` | Pass |
| 429 rate | Vercel logs / analytics | No sustained guest 429 &gt; 25% of searches |
| Error rate | Vercel functions | `/api/search` 5xx &lt; 1% over 24h |

### Weekly (invite cohort growing)

| Check | Action |
|-------|--------|
| p95 latency | `npm run test:beta-latency-probe` |
| Cache hit behavior | `npm run test:beta-cache-dedupe` |
| Adjust caps | If SerpAPI &gt; 80% with healthy UX, lower `GUEST_SEARCH_DAILY_MAX` before upgrade plan |

### Log queries (Vercel)

Watch for:

- `upstream_fail`
- `SEARCH_FAILED`
- `shadow_stack_skipped` (expected when phases OFF)
- Rate limit codes: `GUEST_DAILY`, `GUEST_HOURLY`, `GUEST_BURST`

---

## 5. Alert matrix (who gets paged)

| Alert | Threshold | Channel | Runbook |
|-------|-----------|---------|---------|
| SerpAPI 70% | Email from SerpAPI | Eng on-call | § 6 step 2 |
| SerpAPI 90% | Email | Eng + pause invites | § Emergency |
| OpenAI 80% of cap | Email from OpenAI | Eng | § Emergency B |
| Search 5xx &gt; 5 min | Manual / uptime | Sev-1 | `BETA_INCIDENT_RESPONSE` |
| Health `redis: false` in prod | Automated probe | Eng | Set Upstash vars |

---

## 6. Emergency shutdown procedure

Use when **cost runway &lt; 48h** or **abuse / quota exhaustion** threatens production. Prefer ordered steps — stop at first step that stabilizes spend.

### A. Immediate (no redeploy) — ~5 minutes

| Step | Action | Effect |
|------|--------|--------|
| A1 | **Pause new invites** | Stops cohort growth |
| A2 | SerpAPI dashboard: note quota; contact support if hard block | Visibility |
| A3 | Post internal status | Comms |

### B. Vercel env toggles (redeploy required) — ~10 minutes

Apply in **Vercel → Production → Environment Variables**, then redeploy.

| Priority | Variable | Emergency value | Effect |
|----------|----------|-----------------|--------|
| B1 | `GUEST_SEARCH_DAILY_MAX` | `5` | Cuts guest SerpAPI |
| B2 | `GUEST_SEARCH_HOURLY_MAX` | `3` | Tighter guest window |
| B3 | `GUEST_SEARCH_BURST_PER_MIN` | `2` | Stops burst abuse |
| B4 | `SEARCH_GUEST_CACHE_SECONDS` | `600` | More cache, fewer API calls |
| B5 | `QUANTAI_LIVE_DISCOVERY` | `off` | Disables live discovery SerpAPI path |
| B6 | `SEARCH_SERPAPI_RETRIES` | `0` | Fewer duplicate SerpAPI calls |
| B7 | `QUANTAI_SEARCH_HEURISTIC_COMMERCE_AI` | `true` | Ensures no OpenAI on search batch |

**Verify after deploy:**

```bash
SEARCH_BASE_URL=https://YOUR_DOMAIN npm run test:beta-prod-smoke
curl -s https://YOUR_DOMAIN/api/health
```

### C. Auth-only search (severe) — ~15 minutes

| Step | Action | Effect |
|------|--------|--------|
| C1 | Set `GUEST_SEARCH_DAILY_MAX=0` or `1` | Effectively blocks guest search |
| C2 | Communicate: “Sign in to search during maintenance” | UX expectation |
| C3 | Monitor signed-in volume separately | Auth limits still apply |

### D. Provider kill switch (last resort)

| Step | Action | Effect |
|------|--------|--------|
| D1 | **Rotate or remove `SERPAPI_KEY`** in Vercel | All search 503 — health `serpapi: false` |
| D2 | **Revoke / cap OpenAI key** at platform | Compare/copilot 503; build may fail on next deploy |
| D3 | Enable Vercel **deployment protection** / password | Full site gate |

**Recovery:** Restore keys from provider dashboards → `npm run env:pull` locally to verify → redeploy → run `test:public-beta-p0:remote`.

### E. Do NOT use as cost mitigation

- Enabling APPLY or ranking mutation flags
- Enabling Phases 11–18 “for better cache”
- Disabling Upstash (makes abuse worse across instances)
- Removing rate limits entirely

### Post-incident

| Step | Action |
|------|--------|
| 1 | Document peak RPS and SerpAPI/OpenAI spend in incident log |
| 2 | Reset env caps to beta defaults in `docs/PRODUCTION_ENV_MANIFEST.md` |
| 3 | Upgrade SerpAPI plan or adjust invite cohort size |
| 4 | Review `docs/COST_MONITORING.md` thresholds |

---

## 7. Combined launch checklist (cost)

- [ ] SerpAPI quota ≥ 7 days at projected beta volume (+30% headroom)
- [ ] SerpAPI 70% / 90% email alerts on
- [ ] OpenAI monthly budget cap + email on
- [ ] `QUANTAI_SEARCH_HEURISTIC_COMMERCE_AI=true` on Production
- [ ] `UPSTASH_REDIS_*` set (distributed limits)
- [ ] Guest caps confirmed (`GUEST_SEARCH_*` or defaults)
- [ ] On-call named for daily monitoring
- [ ] Emergency shutdown (§ 6) understood by eng + ops
- [ ] Owner assigned for `/api/search` and compare-verdict 503 spikes

---

## 8. Reference — cost guardrails by scale

| Users | SerpAPI | OpenAI monthly cap |
|------:|---------|-------------------|
| 10 internal | Manual watch | $25 |
| 100 invite | 70% / 90% alerts | $50–100 |
| 1000 | Upgrade plan + daily review | Review weekly |

See also: `docs/SERPAPI_OPENAI_COST_ALERTS.md` (abbreviated duplicate — this doc is canonical for operations).
