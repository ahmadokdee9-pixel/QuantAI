# QuantAI — Live Demo Readiness

**Sprint:** Acquisition Prep Sprint 3  
**Purpose:** Whether a buyer-facing live demo can run **now**, without inventing credentials.  
**Secret policy:** Names and SET/MISSING only — never values.

---

## Executive status

| Question | Answer |
|----------|--------|
| Local CORE DEMO credentials (via `.env.local` + `env-status`) | **Mostly READY** — Clerk, Supabase, SerpAPI, OpenAI present |
| Stripe | **NEEDS CREDENTIAL** for billing demo; **NOT REQUIRED FOR CORE DEMO** (search) |
| `NEXT_PUBLIC_APP_URL` | **NEEDS CREDENTIAL / CONFIG** (often unset locally; recommended for Stripe returns + absolute URLs) |
| `SEARCH_BASE_URL` | **UNSET in this workspace** — remote smoke/latency probe **not runnable here** |
| Upstash | **OPTIONAL** — not verified set; in-memory rate-limit fallback exists |
| Vercel project link | **READY (linked)** — workspace has `.vercel` → project **`quant-ai`** |
| Live production URL measurement | **BLOCKED** until seller provides `SEARCH_BASE_URL` and confirms deploy |

**Bottom line:** Core **local** demo is feasible if `npm run dev` / local server is started with existing `.env.local`. A polished **buyer remote demo** needs a deployed URL + warm golden queries + `SEARCH_BASE_URL` for evidence capture.

---

## Dependency classification

| Dependency | Class | Notes |
|------------|-------|-------|
| SerpAPI (`SERPAPI_KEY`) | **READY** (local) | Required for search; without it empty/503 |
| Clerk publishable + secret | **READY** (local) | Auth UI / entitlements |
| Supabase URL + service role | **READY** (local) | Saved/history/truth tables — apply migrations |
| OpenAI (`OPENAI_API_KEY`) | **READY** (local) | Compare/AI; also needed for clean production build in current wiring |
| Stripe secret / prices / webhook | **NEEDS CREDENTIAL** | Monetization demo only |
| `NEXT_PUBLIC_APP_URL` | **NEEDS CONFIG** | Set to staging/production HTTPS for buyer demos |
| Upstash Redis | **OPTIONAL** | Recommended for production multi-instance rate limits |
| Analytics sink | **OPTIONAL** | Not required for demo |
| `CRON_SECRET` / refresh cron | **NOT REQUIRED FOR CORE DEMO** | Ops only |
| `SEARCH_BASE_URL` | **NEEDS CONFIG** | Required for remote probe scripts |
| Vercel deploy (`quant-ai`) | **READY** (project linked) — **deploy health NEEDS HUMAN VERIFY** | Confirm Production deployment is green in dashboard |

---

## Minimal steps to unlock a buyer-facing remote demo

1. Confirm Vercel **Production** deploy for `quant-ai` is healthy.  
2. Set Production env: CORE DEMO keys + `NEXT_PUBLIC_APP_URL=https://<your-domain>`.  
3. Apply Supabase migrations if not already.  
4. Open the production URL; warm queries from `docs/GOLDEN_DEMO_QUERIES.md` (suggest 1, 3, 5).  
5. Export evidence:  
   `SEARCH_BASE_URL=https://<your-domain> BETA_PROBE_WARM=true npm run test:beta-latency-probe`  
6. Optional: Stripe live keys only if showing billing.  
7. Optional: Upstash for production-grade rate limits.

---

## What not to claim in demos

- That remote latency numbers exist without running the probe  
- That Stripe billing works without keys  
- That dormant intelligence flags are “on”  
- Inventory ownership (SerpAPI-dependent)
