# 3. Product Overview

---

## Product definition

**QuantAI** is an AI-assisted **commerce decision application**. Shoppers search for products; QuantAI returns a ranked, calibrated set of multi-merchant offers with actionable buying guidance.

---

## Core user journey

```text
Search query
  → Multi-merchant discovery
  → Enrichment & trust/value signals
  → Phase A canonical ranking
  → Decision calibration (labels + confidence)
  → Results UI (cards, brief, diversity, discounts)
  → Compare / Save / Outbound to merchant
```

---

## Primary capabilities (live product surface)

| Capability | Description |
|------------|-------------|
| Commerce search | Guest and authenticated search via `/api/search` |
| Canonical ranking | Single Phase A order authority |
| Decision labels | BUY / STRONG BUY / COMPARE / BEST VALUE / AVOID |
| Merchant diversity | Safeguards against single-store collapse |
| Verified discounts | Chips / emphasis when evidence is credible |
| Compare | Tray + compare-verdict intelligence |
| Continuity | Saved products, watchlist, history, memory (auth + Supabase) |
| Accounts & billing | Clerk auth; Stripe checkout / portal foundation |
| Marketing / product pages | Home, pricing, how-it-works, commerce-intelligence, legal, dashboard |

---

## What QuantAI is not

- Not a marketplace with checkout of its own inventory  
- Not a proprietary product catalog owner  
- Not an exclusive affiliate network operator (outbound merchant routing only)  
- Not a claim that “all intelligence engines are live” — many experimental layers are **default OFF**  

---

## Product surfaces

| Surface | Role |
|---------|------|
| Homepage / search | Primary acquisition and demo surface |
| Results grid + decision brief | Core product value |
| Compare lane | Alternative evaluation |
| Saved / dashboard | Retention hooks (auth) |
| Pricing / billing | Monetization foundation |
| Commerce intelligence pages | Narrative / education surface |

---

## Quality posture

| Gate (acquisition-critical) | Role |
|-----------------------------|------|
| Phase A rank authority | Order correctness |
| Decision calibration | Label / mismatch discipline |
| Phase 4 ranking validation | Golden / integrity checks |
| Merchant diversity | Cross-merchant preservation |
| P0 production readiness | Env / stabilization / diversity bundle |

Live demo quality depends on complete environment credentials and upstream latency; cold first searches can take several seconds.

---

## Naming note

- **Brand / product:** QuantAI  
- **npm package name:** `smartbuy`  
- Treat `smartbuy` as the historical package identifier; buyer-facing brand is QuantAI.
