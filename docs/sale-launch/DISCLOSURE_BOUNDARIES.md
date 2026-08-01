# Disclosure Boundaries — QuantAI Sale

Use these levels consistently across marketplaces, email, calls, and diligence.

---

## LEVEL 1 — Public listing
**Audience:** Anyone on a marketplace or public web  
**Goal:** Attract qualified interest without creating diligence or security risk  

### Include
- Product name, category, one-liner, short/long description  
- Problem / solution at business level  
- High-level capabilities (search, ranking, labels, compare, save, billing foundations)  
- High-level stack family (Next.js/React/TypeScript; standard SaaS auth/DB/billing; external discovery; optional LLM)  
- What is included / not included in the sale (non-secret)  
- **Pre-revenue** status; no verified users/customers claimed  
- Honest limitations (upstream dependency, cold-search latency character, not a catalog owner)  
- Ideal buyer profiles and growth themes  
- Public screenshots and public demo video of the UI  
- Public FAQ  
- Contact method  

### Exclude
- Repository URLs (private)  
- API keys, tokens, passwords, env values  
- Detailed internal architecture / file maps  
- Test output dumps presented as marketing SLAs  
- Credential-transfer steps with live secrets  
- Customer PII, analytics of real users  
- Unsupported revenue/user/performance guarantees  
- Asking sellers to paste Stripe/Clerk/Supabase dashboards publicly  

### Allowed public demo URL
Public product hostname only (e.g. listing website / demo app). Never append admin paths or query params containing secrets.

---

## LEVEL 2 — Qualified buyer after initial conversation
**Audience:** Buyer who replied seriously; intro call completed; identity roughly vetted  
**Goal:** Enough substance to justify NDA without handing over the crown jewels  

### Add
- Clearer commercial narrative (why sale; seller involvement proposal)  
- Indicative cost categories (not necessarily exact invoices)  
- More precise third-party dependency list (vendor names OK; no keys)  
- Demo walkthrough live or recorded with Q&A  
- High-level transfer checklist (what accounts exist)  
- Naming note (`smartbuy` package vs QuantAI brand)  
- Summary of live vs dormant capability *policy* (without enabling flags or deep internals)  
- Preliminary price range discussion if seller chooses  

### Still exclude
- Git access  
- Full technical data room  
- Raw probe JSON / internal audit dumps  
- Production credentials  
- Database exports with PII  

---

## LEVEL 3 — Signed NDA / serious due diligence
**Audience:** Signed NDA + serious intent (and preferably escrow/LOI path defined)  
**Goal:** Full technical and operational diligence  

### Add
- Private repository access (read-only initially recommended)  
- Detailed architecture docs and data room index  
- Offline gate evidence (Phase A, calibration, Phase 4, diversity, P0, etc.)  
- Known limitations / risk register  
- Moat memo and asset inventory  
- Environment setup and secrets **process** (rotation plan; still minimize live secret sharing until close)  
- Latency / demo evidence artifacts with methodology  
- Migration/transfer runbooks (Vercel, Clerk, Supabase, Stripe, discovery, DNS)  
- Legal: IP assignment drafts, counsel items  
- Optional: staging credentials with least privilege, time-boxed  

### Still careful even under NDA
- Prefer rotating secrets at close over emailing long-lived production keys  
- Log who received access  
- Do not grant destructive cloud permissions early  

---

## Quick routing table

| Topic | Level |
|-------|-------|
| Marketplace listing copy | 1 |
| Teaser PDF / one-pager | 1 |
| Screenshots of UI | 1 |
| Demo video of UI | 1 |
| Vendor names | 2 |
| Asking price | 2 (or 1 if marketplace requires — seller choice) |
| Repo access | 3 |
| Architecture deep dive | 3 |
| Test evidence packs | 3 |
| Credential transfer | 3 (at closing) |
| Revenue claims | Only if verified documents exist — else state pre-revenue at all levels |

---

## Enforcement rule

If unsure whether something is public-safe: **default to Level 2+** and do not publish.
