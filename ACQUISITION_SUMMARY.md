# QuantAI — Acquisition Executive Summary

**Product:** QuantAI (repository/npm package name: `smartbuy`)  
**Document type:** Executive diligence overview (~2 pages)  
**No sale price. No invented traction or revenue.**

---

## What is being acquired

A production-oriented **commerce decision application**: Next.js web app + proprietary search orchestration, ranking, product-truth, discount authenticity, merchant-diversity, and shopper-label calibration — plus Supabase schema, Stripe/Clerk wiring, ops docs, and a large offline regression suite.

The buyer receives **software and engineering IP**, not a proprietary global product catalog.

---

## What QuantAI does

A user searches for a product. QuantAI retrieves multi-merchant listings via SerpAPI, enriches and ranks them under **Phase A canonical ranking**, then applies **decision calibration** so the surface shows actionable labels (**BUY / COMPARE / AVOID / BEST VALUE**) with confidence — including verified-discount presentation when evidence supports it, and merchant diversity safeguards so useful retailer alternatives are not casually collapsed.

---

## Why it is differentiated

It is not “another shopping search UI.” Differentiation is the **decision layer**:

- Single canonical rank authority across grid / brief / compare  
- Calibrated shopper labels with mismatch discipline  
- Verified-only discount emphasis  
- Cross-merchant preservation + diversity controls  
- Truth/SKU/price observation foundation  
- Production stabilization for slow upstream feeds  

Honest limit: discovery quality and latency inherit from SerpAPI/network.

---

## Current product maturity

**Invite/public-beta capable engineering** with frozen core decision behavior and strong offline validation gates. Acquisition packaging (Sprints 1–3) raises transferability and diligence quality.  

**Not claimed:** user counts, GMV, revenue, or exclusive retailer contracts (none verified in-repo for this summary).

---

## Technical assets included

- Source repository and documentation data room  
- Phase A ranking + calibration + related truth/intelligence code (live core)  
- UI for search, compare, saved, billing  
- Supabase migrations (~16 tables)  
- Stabilization, rate-limit, health/cron routes  
- Offline tests; verified gates: build, tsc, Phase A 11/11, calibration 17/17, Phase 4 23/23, P0  

Dormant flagged “phase” stacks are **inventory**, not live features unless enabled.

---

## Monetization foundation

Stripe checkout / portal / webhooks and plan entitlements exist. Stripe keys may be optional for a search-only demo. Monetization maturity depends on buyer GTM — the codebase provides the foundation, not proven revenue.

---

## Transferability

**Transferable** to a buyer who accepts Vercel + Clerk + Supabase + SerpAPI + OpenAI (+ Stripe/Upstash). Checklists and secret handover docs exist.  

**Not** a same-day multi-cloud port. Legal transfer requires counsel confirmation of LICENSE/IP.

---

## Key dependencies

SerpAPI (critical), Clerk, Supabase, OpenAI, Vercel; Stripe optional for billing demo; Upstash recommended.

---

## Known limitations (summary)

External latency; cold first search; no owned inventory; dormant layers must not be oversold; CI ≠ full test inventory; serverless memory fallbacks without Upstash; counsel IP pending. Full list: `docs/KNOWN_LIMITATIONS.md`.

---

## What the buyer receives on day one

1. Runnable product (with credentials)  
2. Decision-engine IP and regression locks  
3. Acquisition data room (`docs/FINAL_DATA_ROOM_INDEX.md`)  
4. Demo script + golden queries  
5. Ops/cost/incident runbooks  

---

## Immediate opportunities after acquisition (non-speculative)

- Operate invite beta with cost caps  
- Attach live latency artifacts and harden demo staging  
- GTM / monetization using existing Stripe foundation  
- Selective enablement of dormant layers **only** under a governed program  
- Post-close maintainability (search-route modularization) **without** changing frozen decision semantics until intentional  

---

## Diligence entry point

**Start:** [`docs/FINAL_BUYER_DATA_ROOM.md`](docs/FINAL_BUYER_DATA_ROOM.md)  
Canonical exec summary: [`docs/ACQUISITION_EXECUTIVE_SUMMARY.md`](docs/ACQUISITION_EXECUTIVE_SUMMARY.md)  
Supporting index: `docs/FINAL_DATA_ROOM_INDEX.md` → README → Architecture one-pager → Live capability map → Known limitations → Risk register → Demo script.

*(This root file remains a supporting executive overview; prefer `docs/ACQUISITION_EXECUTIVE_SUMMARY.md` going forward.)*
