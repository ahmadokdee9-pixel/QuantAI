# 18 — FAQ

Canonical facts: [`MASTER_INDEX.md`](./MASTER_INDEX.md).

---

### Is QuantAI generating revenue?
**Not evidenced in the repository.** Treat as **pre-revenue** unless separate financials are provided.

### Are there verified users/customers?
**No verified counts in-repo.**

### What does the buyer receive?
Proprietary application source, decision/ranking IP, UI, APIs, 7 migrations / 15 tables, scripts/gates, docs — subject to the purchase agreement. SaaS accounts/domains only if negotiated.

### Is the code proprietary?
Private package + proprietary draft `LICENSE`. Transfer via written agreement.

### Required third parties?
SerpAPI, Clerk, Supabase, host (Vercel-oriented), Stripe for billing, OpenAI for AI surfaces, optional Upstash.

### Ongoing costs?
Usage-variable SerpAPI + OpenAI plus SaaS fees. Exact burn: seller input (not in source).

### Deployment difficulty?
Feasible for a Next.js-competent team with SaaS accounts; not zero-config. See [Deployment Guide](./13_Deployment_Guide.md).

### What is unfinished?
GTM/monetization proof; latency vs big-tech shopping UX; dormant modules flag-OFF; `/analytics` placeholder; `quantai_feedback` table missing from migrations; large search route maintainability.

### Performance evidence?
Probe scripts/docs exist. Cold search can take multiple seconds. No public SLA is asserted here.

### LIVE vs DORMANT?
See `docs/LIVE_CAPABILITY_MAP.md` and [06](./06_AI_and_Intelligence_System.md).

### Replace SerpAPI?
Possible in principle; not trivial — fetch path is coupled to current upstream.

### Rename product?
Yes, with engineering/branding work. Package name remains `smartbuy` historically.

### PII on transfer?
Clerk-linked rows may exist in a live DB — handle under privacy law. Prefer scrubbed staging for diligence.

### Credentials in this data room?
**No.**

### Ideal structure?
Asset/IP purchase, escrow, NDA diligence, LOI, staged transfer. Counsel required.

### Phase A location?
`lib/truth/canonicalSearchRank.ts`.

### Calibration location?
`lib/ui/canonicalDecisionCalibration.ts`.

### API / page / table counts?
21 API route files · 12 pages · 15 tables · 7 migrations.

### Does CI run every test?
No. Many `test:*` scripts exist; CI runs a subset. Run acquisition gates explicitly.

### Plan prices?
Free €0 · Pro €19 · Premium (Power Buyer) €49 — from `lib/subscription/plans.ts`.
