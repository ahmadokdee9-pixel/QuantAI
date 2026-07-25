# QuantAI — IP and Ownership

**Purpose:** Acquisition diligence — what the repository owns vs. what it depends on.  
**Related:** `LICENSE`, `docs/ACCESS_AND_SECRETS_HANDOVER.md`, `QUANTAI_ACQUISITION_READINESS_AUDIT.md`  
**Status:** Technical inventory. Legal conclusions require counsel.

**SELLER/COUNSEL CONFIRMATION REQUIRED** for: copyright holder identity, contractor IP assignments, trademark status, and final transfer language.

---

## A. Proprietary QuantAI code (expected transfer subject)

Assuming seller owns copyright (confirm with counsel), a buyer of the repository acquires source and authored materials such as:

| Area | Examples (paths) |
|------|------------------|
| Search orchestration | `app/api/search/`, `lib/search/` |
| Phase A ranking authority | `lib/truth/canonicalSearchRank.ts`, related truth/rank modules |
| Decision calibration / shopper labels | `lib/ui/canonicalDecisionCalibration.ts`, Phase 45 activation |
| Commerce / discount / value / merchant logic | `lib/intelligence/*`, `lib/truth/*`, `lib/deals/*` |
| Product UI | `components/`, `app/page.tsx`, related layouts |
| Billing / entitlements wiring | `lib/subscription/`, Stripe route handlers |
| Persistence adapters | `lib/supabaseAdmin.ts`, intelligence API routes |
| Migrations authored for this product | `supabase/migrations/` |
| Ops / acquisition docs authored here | `docs/**` (excluding vendored noise), scripts under `scripts/` |
| Automated regression scripts | `scripts/test-*.mjs`, related npm scripts |

Package metadata name: **`smartbuy`**. Product branding in UI/docs: **QuantAI**.

---

## B. Third-party SaaS dependencies (not owned)

| Service | Role | Ownership |
|---------|------|-----------|
| Clerk | Authentication / sessions | Clerk, Inc. — buyer needs account transfer or recreation |
| Supabase | Database / storage API | Supabase — project transfer or migrate schema/data |
| Stripe | Subscriptions / payments | Stripe — account / price IDs / webhook transfer |
| SerpAPI | Shopping search upstream | SerpAPI — API account + quota |
| OpenAI | Compare / copilot / optional commerce AI | OpenAI — API project + keys |
| Vercel | Hosting / edge / env / cache | Vercel — project transfer or redeploy |
| Upstash (if used) | Redis rate limit / shared cache | Upstash — optional but recommended |

QuantAI does **not** own these platforms or their user data hosted solely in those vendors’ systems until transferred under each vendor’s process.

---

## C. Open-source dependencies

Declared in `package.json` / `package-lock.json` (Next.js, React, Zod, Framer Motion, Geist, Lucide, Clerk/Supabase/Stripe/OpenAI/Upstash SDKs, etc.).

- Direct application dependencies are generally MIT/Apache-class commercial-friendly SDKs.
- Optional transitive imaging stack may include **LGPL-3.0-or-later** (`@img/sharp-libvips-*` via sharp) — disclose in diligence; typically acceptable for SaaS binary distribution.
- Full license audit of the lockfile remains buyer counsel’s responsibility.

Open-source code remains under **its own licenses**. Acquisition of QuantAI source does not re-license third-party OSS.

---

## D. External services / APIs

| Dependency | What QuantAI uses | What QuantAI does **not** own |
|------------|-------------------|-------------------------------|
| SerpAPI → Google Shopping | Product listing feed for search | Product catalog, merchant inventory, Google Shopping |
| Merchant storefronts | Outbound product links | Merchant websites, pricing authority, inventory |
| OpenAI APIs | Generated text / analysis when enabled | Foundation models or training data |
| Clerk | Auth users | Identity platform |
| Supabase | App tables | Platform itself |
| Stripe | Billing | Payment network |

---

## E. Assets / data NOT owned by QuantAI

Do **not** claim ownership of:

- SerpAPI / Google Shopping inventory  
- Merchant product catalogs or images hosted by merchants  
- Merchant websites or brands  
- Affiliate networks (none evidenced as proprietary assets in-repo)  
- Third-party foundation models (OpenAI, etc.)  
- Clerk, Supabase, Stripe, OpenAI, Vercel, Upstash platforms  
- End-user personal data stored in Clerk/Supabase until transferred under privacy law + vendor tools  

Any accumulated **application database rows** (saved products, history, observations) are transferable only with the Supabase project / export and applicable privacy compliance — **SELLER/COUNSEL CONFIRMATION REQUIRED**.

---

## Acquisition transfer assumptions

1. Buyer receives Git repository ownership or exclusive license under the acquisition agreement.  
2. Buyer receives or recreates vendor accounts listed in §B.  
3. Environment variables and secrets are **rotated** at closing (see `docs/ACCESS_AND_SECRETS_HANDOVER.md`).  
4. Domain/DNS and `NEXT_PUBLIC_APP_URL` are updated by buyer.  
5. Dormant intelligence feature flags remain **OFF** unless buyer enables them under their own risk (see acquisition audit).  
6. This document is **not** a substitute for the purchase agreement.

---

## Explicit non-claims

QuantAI source does **not** grant exclusive rights to:

- Global product inventory  
- Exclusive retailer partnerships (not evidenced)  
- Guaranteed search latency SLAs without buyer-operated infrastructure  
- “All intelligence layers live in production” — many `QUANTAI_*` / phase flags default **OFF**
