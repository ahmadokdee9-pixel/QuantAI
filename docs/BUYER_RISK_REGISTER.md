# QuantAI — Buyer Risk Register

**Purpose:** Diligence risk transparency. No fear marketing; no hiding.  
**Severity:** LOW · MEDIUM · HIGH  
**Companion:** [`KNOWN_LIMITATIONS.md`](./KNOWN_LIMITATIONS.md)

---

| Risk | Severity | Evidence | Business Impact | Buyer Mitigation | Before Sale Required? |
|------|----------|----------|-----------------|------------------|------------------------|
| External search dependency (SerpAPI) | **HIGH** | Search path requires `SERPAPI_KEY`; empty/fail without quota | Search outage or empty trays; cost overrun | Own account, alerts, budget; monitor quality | **Yes** — account plan + quota |
| End-to-end / cold-search latency | **HIGH** | Upstream-dominated; cold first query cannot use stale prefer | Poor live demos; SLA risk | Warm golden queries; stale-prefer; attach live probe | **Yes** for buyer demos claiming speed |
| Missing live production P50/P95 artifact | **MEDIUM** | `PERFORMANCE_EVIDENCE.md` — not independently evidenced | Diligence gap; cannot defend latency claims | Run `test:beta-latency-probe` vs deploy URL | Recommended before listing SLA claims |
| Vendor lock-in (Vercel/Clerk/Supabase/Stripe/OpenAI) | **MEDIUM–HIGH** | Stack wiring throughout app | Migration cost/time | Accept stack or budget port | Accept in LOI or plan migration |
| Secrets / account transfer | **HIGH** | Secrets must not live in git; handover checklist | Breach or lockout at close | Rotate all keys; follow ACCESS_AND_SECRETS_HANDOVER | **Yes** |
| Third-party licensing / ToS | **MEDIUM** | SerpAPI, OpenAI, Clerk, etc. | Compliance / account rejection | Buyer accepts vendor ToS; counsel review | Counsel as needed |
| Dormant / experimental code overclaim | **HIGH** (diligence) | `LIVE_CAPABILITY_MAP.md`; flags default OFF | Diligence failure; wasted enablement | Pitch LIVE core only; govern enablement | **Yes** — disclosure in data room |
| CI / test scope ≠ full inventory | **MEDIUM** | Many `test:*` scripts; CI subset | False confidence if only CI viewed | Run acquisition gates in diligence | Recommended |
| Environment / staging incompleteness | **MEDIUM** | `NEXT_PUBLIC_APP_URL`, Stripe, Upstash often optional/unset | Broken billing URLs; weak rate limits | Complete Production env checklist | **Yes** for polished demo |
| Merchant / inventory data dependency | **MEDIUM** (strategic) | No owned catalog | Cannot sell as data marketplace | Position as decision layer | Positioning honesty |
| Billing transfer (Stripe) | **MEDIUM** | Stripe routes exist; keys may be unset | Monetization demo gap | Transfer or recreate Stripe products/webhooks | If monetization in thesis |
| Deployment transfer (Vercel/DNS) | **MEDIUM** | Vercel-oriented Next app | Cutover downtime | Transfer project or redeploy + DNS | **Yes** for going-concern ops |
| Naming inconsistency (`smartbuy` vs QuantAI) | **LOW** | `NAMING_NOTE.md`, `package.json` name | Buyer confusion | Document alias; optional rename post-close | Disclosure only |
| Serverless / in-memory cache & rate limits | **MEDIUM** | Memory fallback without Upstash | Inconsistent limits across instances | Enable Upstash in production | Recommended for multi-instance |
| IP / LICENSE confirmation | **HIGH** (legal) | Draft proprietary LICENSE | Closing delay / title risk | Counsel sign-off | **Yes** before close |
| Search route maintainability (~2.5k lines) | **MEDIUM** | Large `route.ts` | Post-close eng cost | Freeze behavior; planned modularization later | No (post-close) |

---

## Diligence use

Use this register with [`FINAL_BUYER_DATA_ROOM.md`](./FINAL_BUYER_DATA_ROOM.md). Treat **Before Sale Required? = Yes** rows as seller/buyer closing actions, not product defects to “fix” by changing ranking or UI pre-sale.
