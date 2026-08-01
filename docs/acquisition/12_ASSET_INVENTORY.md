# 12. Asset Inventory

---

## A. Proprietary product assets (typical transfer set)

| Asset | Description |
|-------|-------------|
| Source repository | Next.js QuantAI application (`smartbuy` package) |
| Search orchestration | `/api/search` pipeline and shopping fetch |
| Phase A ranking | Canonical ranking authority |
| Decision calibration | Label / confidence system |
| Merchant diversity | Ingest + tray safeguards |
| Discount / value gating | Credible promotion handling |
| Truth / observation stack | SKU / price / ranking decision record foundations |
| Comparison system | Compare tray + compare-verdict API |
| Continuity APIs | Saved products, watchlist, history, memory routes |
| UI product surface | Search results, brief, cards, compare components |
| Marketing / product pages | Home, pricing, how-it-works, legal, dashboard, etc. |
| Billing integration | Stripe checkout / portal / webhook wiring |
| Auth integration | Clerk wiring |
| Database migrations | Supabase SQL migrations |
| Test / gate corpus | Acquisition-critical offline scripts + large script inventory |
| Documentation | Ops, env, buyer data room, this seller package |
| Freeze reference | Git tag `quantai-sale-candidate-v1` |

Exact legal transfer is governed by the purchase agreement and IP assignment — not by this inventory alone.

---

## B. Third-party / not owned by default

| Asset | Notes |
|-------|-------|
| Clerk application & users | Transfer or recreate |
| Supabase project & data | Transfer or migrate |
| Stripe account & prices | Transfer or recreate |
| SerpAPI account & quota | **Critical** — transfer or new account |
| OpenAI project | New key / budget typically |
| Vercel project / domains | Transfer or redeploy + DNS |
| Upstash database | Transfer if used |
| Merchant websites / catalogs | Not owned |
| Foundation model weights | Not owned |

---

## C. Runtime surface counts (approximate, diligence-time)

| Layer | Approximate footprint |
|-------|------------------------|
| App pages | ~12 route pages |
| API route handlers | ~22 |
| Intelligence engines | Large estate (`*Engine.ts` scale) — distinguish live vs dormant |
| UI components | ~68 component files |
| DB tables | ~16 across 7 migrations |
| npm `test:*` scripts | Hundreds (CI runs a subset) |

---

## D. Classification summary

| Class | Examples |
|-------|----------|
| **PROPRIETARY IP** | Ranking, calibration, diversity, truth, orchestration, UI decision surface, gates, docs |
| **COMMERCIAL SaaS deps** | Clerk, Supabase, Stripe, SerpAPI, OpenAI, Upstash, Vercel |
| **OPEN SOURCE** | Next.js, React, and typical MIT/Apache-class libraries |
| **NOT OWNED** | Retailer inventory, exclusive partnerships, training corpora |

---

## E. Explicit non-assets

- Verified ARR / user metrics (not asserted)  
- Exclusive retailer contracts (not evidenced)  
- Portable multi-cloud appliance guarantee  
- “All intelligence layers live in production” claim  
