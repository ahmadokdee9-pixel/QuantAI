# 13. Risk Summary

Severity: **LOW · MEDIUM · HIGH**

---

## Top risks for acquirers

| Risk | Severity | Impact | Mitigation |
|------|----------|--------|------------|
| SerpAPI / upstream discovery dependency | **HIGH** | Empty or poor trays; variable COGS | Own account, quotas, monitoring; plan alternate sources |
| Cold / end-to-end search latency | **HIGH** | Weak live demos; SLA risk | Warm staging, caching, stale-prefer; measure P95 honestly |
| IP / LICENSE / assignment clarity | **HIGH** | Closing delay | Counsel + IP assignment before close |
| Secrets & account handover | **HIGH** | Lockout / breach | Rotate all keys; follow access handover |
| Overclaiming dormant AI layers | **HIGH** (diligence) | Trust failure | Sell live core only; disclose flags OFF |
| Vendor lock-in (Vercel/Clerk/Supabase/Stripe/OpenAI) | **MEDIUM–HIGH** | Migration cost | Accept stack or budget port |
| CI ≠ full test inventory | **MEDIUM** | False confidence | Run acquisition gates in diligence |
| Billing / Stripe incompleteness | **MEDIUM** | Monetization demo gap | Complete price IDs & webhooks |
| Serverless in-memory rate/circuit fallbacks | **MEDIUM** | Multi-instance inconsistency | Enable Upstash in production |
| Naming mismatch (`smartbuy` vs QuantAI) | **LOW** | Confusion | Disclose alias |
| Large search route maintainability | **MEDIUM** | Post-close eng cost | Freeze behavior; modularize after close |
| No verified revenue | **MEDIUM** (commercial) | Valuation must be IP/product-based | Price as asset, not cash-flow |

---

## Risk posture by category

| Category | Summary |
|----------|---------|
| Product | Strong decision core; demo-sensitive to latency/env |
| Technical | Feature-dense; diligence-visible complexity |
| Commercial | Early; monetization foundation present, traction not asserted |
| Legal / IP | Must be cleared explicitly in deal docs |
| Operational | Runnable with complete credentials; transfer is checklist-heavy |
| Strategic | Valuable as decision IP; weak as inventory business |

---

## What is *not* a reason to abandon diligence

- Presence of dormant experimental modules (if disclosed)  
- Package name `smartbuy` (if documented)  
- Need for buyer-owned SaaS accounts (normal)  

---

## What *is* deal-blocking if ignored

- No IP assignment / ownership clarity  
- No workable SerpAPI (or successor) plan  
- Demo environment that routinely fails or times out  
- Marketing claims that dormant layers are live  

---

## Seller honesty standard

This package prefers **transparent risk** over hype. A serious buyer will discover these items anyway; disclosing them early increases close probability.
