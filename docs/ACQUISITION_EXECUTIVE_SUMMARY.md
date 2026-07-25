# QuantAI — Acquisition Executive Summary

**Audience:** Founder, CTO, technical acquirer, micro-SaaS buyer, strategic commerce company  
**Length:** ~2 pages · **No valuation · No asking price · No unsupported traction claims**  
**Brand:** QuantAI · **Package:** `smartbuy` · **Freeze tag:** `quantai-sale-candidate-v1`

Full diligence entry: [`FINAL_BUYER_DATA_ROOM.md`](./FINAL_BUYER_DATA_ROOM.md)

---

## What is QuantAI?

An AI-assisted **commerce decision application**. A shopper searches; QuantAI discovers multi-merchant offers via external shopping APIs, ranks them under **Phase A canonical ranking**, then applies **decision calibration** so the surface shows actionable labels (**BUY / STRONG BUY / COMPARE / BEST VALUE / AVOID**) with confidence — including verified-discount presentation when evidence supports it, and merchant-diversity safeguards so useful retailer alternatives are not casually collapsed.

It is software and decision IP — **not** a proprietary global product catalog.

---

## Why is it valuable?

Most shopping UIs sort or badge listings. QuantAI’s value is a **locked decision system**:

- One canonical order authority across grid, brief, and compare  
- Calibrated shopper labels with mismatch discipline  
- Credible-only discount emphasis  
- Cross-merchant preservation + diversity controls  
- Truth / SKU / price-observation foundation  
- Production stabilization for slow upstream feeds  
- Offline regression gates on the decision core  

Honest limit: discovery quality and latency inherit from SerpAPI / network.

---

## What exists today?

- Runnable Next.js product (with credentials)  
- Live search → Phase A → calibration → results / compare / save  
- Clerk auth, Supabase persistence, Stripe billing foundation  
- Stabilization (cache, stale-prefer, timeouts, circuit breaker)  
- Acquisition documentation data room  
- Verified gates: build, tsc, Phase A 11/11, calibration 17/17, Phase 4 23/23, merchant diversity, P0  

**Not claimed:** verified revenue, user counts, GMV, or exclusive retailer contracts.

---

## What is proprietary?

Search orchestration, Phase A ranking, truth/ranking-decision records, decision calibration, discount authenticity gating, merchant diversity, decision UI, comparison and saved-product flows, migrations, tests, and documentation.

Third-party platforms (Next.js, Clerk, Supabase, Stripe, SerpAPI, OpenAI, Vercel, Upstash) are **dependencies**, not proprietary assets.

---

## What does it depend on?

| Critical | Important | Optional for search demo |
|----------|-----------|--------------------------|
| SerpAPI | Clerk, Supabase, Vercel (or equiv.), OpenAI for AI surfaces | Stripe, Upstash, analytics sink |

Accounts/licenses transfer only if agreed separately.

---

## What is proven?

- Offline decision/ranking correctness via acquisition gates  
- Offline stale-prefer / race mechanism correctness  
- Ranking kernel latency at millisecond scale (local)  

**Not proven in-repo:** live production search P50/P95 (must attach probe artifact against a deployed URL).

---

## What remains to deploy / operate?

- Buyer (or seller) production/staging with complete env (`NEXT_PUBLIC_APP_URL`, etc.)  
- Supabase migrations applied  
- Secrets rotation and account transfer  
- Warm demo + optional live latency probe  
- Counsel confirmation of LICENSE / IP  
- Domain / DNS / webhooks as applicable  

---

## What would the buyer receive?

1. Source repository + git history + tag `quantai-sale-candidate-v1`  
2. Decision-engine IP and regression locks  
3. Buyer data room (this package)  
4. Demo script + golden queries  
5. Ops / cost / incident / handover checklists  

---

## Major risks

1. SerpAPI / upstream dependency and quota risk  
2. Cold-search latency vs consumer search expectations  
3. Vendor coupling (not lift-and-shift)  
4. Overselling dormant flagged intelligence  
5. LICENSE / IP counsel still required  
6. Live latency SLA claims without probe artifacts  
7. CI covers a subset of the large offline test inventory  

Details: [`BUYER_RISK_REGISTER.md`](./BUYER_RISK_REGISTER.md) · [`KNOWN_LIMITATIONS.md`](./KNOWN_LIMITATIONS.md)

---

## Fastest path to production

1. Provision Clerk + Supabase + SerpAPI (+ OpenAI)  
2. Apply migrations; set env from [`ENVIRONMENT.md`](./ENVIRONMENT.md)  
3. Deploy to Vercel (or equivalent); set `NEXT_PUBLIC_APP_URL`  
4. Run acquisition gates; warm golden queries  
5. Enable Stripe / Upstash when billing and multi-instance limits matter  
6. Keep dormant APPLY stacks **off** until a governed program exists  

---

## Diligence start

[`FINAL_BUYER_DATA_ROOM.md`](./FINAL_BUYER_DATA_ROOM.md) → README → Architecture one-pager → Live capability map → Known limitations → Risk register → Handover.
