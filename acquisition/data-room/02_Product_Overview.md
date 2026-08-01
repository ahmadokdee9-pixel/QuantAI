# 02 — Product Overview

Canonical facts: [`MASTER_INDEX.md`](./MASTER_INDEX.md).

---

## Definition

**QuantAI** turns multi-merchant shopping results into ranked, calibrated buying decisions. Package name in npm is `smartbuy`; product brand in UI/docs is QuantAI.

| Attribute | Evidence |
|-----------|----------|
| Delivery | Web application (Next.js App Router); no native iOS/Android app package in-repo |
| License file | Proprietary acquisition/transfer draft (`LICENSE`) |
| Catalog ownership | None — discovery is external (SerpAPI) |

---

## Journeys that exist in code

### Guest search
`/` → `/api/search` (public) → results UI → optional compare / outbound.

### Authenticated continuity
Clerk modal sign-in/up → protected routes (`proxy.ts`): `/dashboard`, `/saved`, `/billing`, `/alerts`, `/analytics`.

### Billing
`/pricing` → `POST /api/stripe/checkout` (requires auth + Stripe env) → webhook updates `user_billing_state`.

---

## Pages (12)

| Route | Role | Maturity note |
|-------|------|----------------|
| `/` | Home / primary search | Core |
| `/pricing` | Plans | Core |
| `/how-it-works` | Education | Marketing |
| `/contact` | Contact | Marketing |
| `/commerce-intelligence` | Narrative | Marketing |
| `/commerce-intelligence/[region]/[category]` | Static narrative pages (5 `generateStaticParams` pairs) | Marketing |
| `/legal/[slug]` | Policies | Legal |
| `/dashboard` | Auth hub | Continuity |
| `/saved` | Saved products | Continuity |
| `/billing` | Billing UI | Continuity |
| `/alerts` | Watchlist-driven alerts UI (loads `/api/intelligence/watchlist`) | Continuity |
| `/analytics` | **Placeholder** — copy states portfolio analytics “will aggregate”; links to dashboard/home | **Not a full analytics product** |

---

## What QuantAI is not

- Not a first-party checkout marketplace  
- Not an owned global SKU catalog  
- Not evidenced as a scaled consumer brand with published MAU  
- Not “all intelligence modules enabled by default”  

---

## Product design decision

**Decision coherence over raw listing volume:** Phase A supplies one order authority; decision calibration supplies shopper labels so grid/brief/compare can stay aligned.
