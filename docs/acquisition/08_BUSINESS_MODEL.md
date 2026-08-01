# 8. Business Model

---

## Model type

**B2C SaaS foundation** with a free searchable surface and paid tiers, plus strategic optionality for affiliate / API / white-label monetization.

QuantAI is **not** modeled as a marketplace take-rate business (it does not own checkout inventory).

---

## Primary model (in product today)

| Element | Status |
|---------|--------|
| Free / guest search | Core acquisition funnel |
| Authenticated accounts (Clerk) | Continuity features (saved, memory, etc.) |
| Paid plans (Stripe) | Pricing page + checkout / portal / webhook foundation |
| Outbound merchant links | Shopper completes purchase on retailer sites |

Exact plan names/prices should be confirmed against the live Pricing page at diligence time; treat Stripe price IDs as environment-specific.

---

## Value exchange

```text
Shopper gets: faster, clearer multi-merchant decisions
QuantAI gets: subscription revenue (and/or future affiliate/API revenue)
Merchants get: qualified outbound traffic (indirectly)
```

---

## Cost structure (qualitative)

| Cost driver | Nature |
|-------------|--------|
| SerpAPI | Variable COGS per search / discovery |
| OpenAI | Variable COGS on AI surfaces |
| Vercel / Clerk / Supabase / Stripe / Upstash | Platform subscriptions |
| Engineering | Maintain decision core + latency/ops |

Unit economics are **environment- and usage-dependent**. This package does **not** assert fixed COGS or contribution margins.

---

## Commercial maturity

| Claim | Status |
|-------|--------|
| Billing plumbing exists | Yes |
| Verified recurring revenue | **Not asserted** |
| Self-serve growth engine proven | **Not asserted** |
| Enterprise contracts | **Not asserted** |

---

## Strategic model variants (buyer choice)

1. **Consumer SaaS** — grow Pro/Premium subscriptions  
2. **Affiliate / media hybrid** — monetize qualified outbound intent  
3. **B2B decision API** — sell ranking/calibration as middleware  
4. **Strategic embed** — integrate into acquirer’s shopping properties  

The codebase supports (1) most directly; (2)–(4) are commercial packaging opportunities, not fully productized GTM machines.
