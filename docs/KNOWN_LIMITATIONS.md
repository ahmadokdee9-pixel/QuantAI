# QuantAI — Known Limitations (Acquisition Disclosure)

**Purpose:** Reduce diligence surprises. Conservative and evidence-based.

| ID | Limitation | IMPACT | SEVERITY | MITIGATION | BUYER ACTION REQUIRED |
|----|------------|--------|----------|------------|------------------------|
| L1 | **SerpAPI dependency** for product listings | No key / quota exhaustion → empty or failed search | **High** | Quota alerts; cost docs; stabilization timeouts | Own SerpAPI account; set alerts; budget plan |
| L2 | **End-to-end latency dominated by external APIs/network** | Cold first search can feel slow vs consumer search engines | **High** | Warm cache, stale-prefer (~3.5s prefer when stale exists), discovery/request timeouts | Warm demo; run live probe; set expectations |
| L3 | **Cold-start / no stale tray on first visit** | First query cannot use stale prefer | **Medium** | Pre-warm golden queries before buyer calls | Follow `BUYER_DEMO_SCRIPT.md` |
| L4 | **Staging/production env completeness** | Missing `NEXT_PUBLIC_APP_URL`, Stripe, etc. degrades polish | **Medium** | Env checklists; CORE DEMO class in ENVIRONMENT.md | Complete Production env before listing demos |
| L5 | **Vendor coupling** (Vercel, Clerk, Supabase, Stripe, OpenAI) | Migration cost; not lift-and-shift | **Medium–High** | Documented transfer checklists | Accept stack or budget migration |
| L6 | **Dormant / experimental intelligence layers** | Overclaim risk if pitched as live | **High (diligence)** | `LIVE_CAPABILITY_MAP.md`; flags default OFF; shadow skip | Do not enable APPLY stacks without a program |
| L7 | **Test inventory ≫ CI coverage** | ~477 `test:*` scripts; CI runs a subset | **Medium** | Document verified acquisition gates only | Treat CI as partial; run P0 gates in diligence |
| L8 | **In-memory rate limit / circuit / stale on serverless** | Weaker consistency across instances without Upstash | **Medium** | Enable Upstash; document fallbacks | Configure Upstash for production |
| L9 | **No proprietary product inventory** | Moat is decision layer, not catalog | **Medium (strategic)** | Honest positioning in README / moat memo | Do not value as data marketplace |
| L10 | **Stripe may be unset** | Billing demo incomplete | **Low** for search-only diligence | Optional for CORE DEMO | Add live Stripe if monetization is in thesis |
| L11 | **Live production latency is slow vs consumer search** | Warm P95 ~8.4s observed (WEAK); cold outliers ~18s | **Medium–High** | Warm demos; disclose WEAK class; cost/provider tuning post-close | Attach/share `PRODUCTION_DEMO_EVIDENCE.md`; set buyer expectations |
| L12 | **LICENSE / IP counsel confirmation pending** | Closing risk | **High (legal)** | Draft LICENSE + IP_AND_OWNERSHIP.md | Counsel sign-off |
| L13 | **Package name `smartbuy` vs brand QuantAI** | Diligence confusion | **Low** | NAMING_NOTE.md | Keep alias or rename later carefully |
| L14 | **Search route monolith (~2.5k lines)** | Maintainability concern | **Medium** | Freeze behavior; post-close refactor program only | Do not rewrite pre-sale |
| L15 | **Image/link quality depends on upstream feed** | Broken images/outliers possible | **Low–Medium** | Outlier filters; identity gates | Monitor SerpAPI quality; do not over-promise |

---

## Diligence statement

QuantAI is a **decision layer on third-party shopping feeds**. Strengths are ranking authority, calibration, discount credibility, and merchant diversity — not exclusive inventory or guaranteed consumer-search latency.
