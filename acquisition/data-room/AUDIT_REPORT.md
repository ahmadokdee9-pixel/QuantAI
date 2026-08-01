# Data Room Audit Report

**Scope:** `/acquisition/data-room`  
**Mode:** Documentation-only verification against repository  
**Date:** 2026-07-29  

---

## Method

1. Re-counted pages, API routes, engines, migrations, tables, `lib/` / `components/` directories from disk  
2. Re-read plan definitions, health route, calibration labels, auth entrypoint, feedback route, alerts/analytics pages  
3. Rewrote documents for identical terminology and canonical facts table in `MASTER_INDEX.md`  
4. Removed or caveated statements that could not be proven  

---

## Inaccuracies corrected

| Issue | Before | After / fix |
|-------|--------|-------------|
| `/analytics` implied as product analytics | Treated like other continuity features | Explicit **placeholder** page (“will aggregate…”) in Product Overview, Features, Frontend, Assets, FAQ, Buyer Overview |
| Premium plan naming | Often “Premium €49” only | **Tier id `premium`, display name Power Buyer, €49** |
| Engine count soft tilde | “~151” | Exact **151** |
| Decision labels incomplete | Sometimes omitted `STRONG BUY` | Full set: `BUY` · `STRONG BUY` · `BEST VALUE` · `COMPARE` · `AVOID` (+ note on `BUY READY` display mapping) |
| Feedback persistence | Vague “verify table” | Documented: API targets `quantai_feedback`; **table absent from migrations**; soft `stored: false` |
| Health payload | Underspecified | Documented actual JSON shape from `app/api/health/route.ts` |
| Auth middleware filename | Could be confused with `middleware.ts` | Stated: **`proxy.ts` only** (no `middleware.ts`) |
| Plan caps incomplete | Partial | Full matrix: searches/AI/watchlist/saved/compare from `plans.ts` |
| Alerts page | Underspecified | Clarified: loads **watchlist** API |
| Table-count regex trap | Risk of counting `IF` from `CREATE TABLE IF NOT EXISTS` | Locked to **15** real `public.*` tables from migrations |

---

## Assumptions removed

- Any implication of verified revenue, users, traffic, GMV, patents, or exclusive retailer partnerships  
- Implication that CI proves the full `test:*` corpus  
- Implication that OpenAI sorts the primary results grid  
- Implication that all intelligence engines are live  
- Implication that `/analytics` is an operational analytics product  
- Exact monthly infrastructure spend figures (not in source)  
- Soft claims of “portable multi-cloud tomorrow” without caveats  

---

## Documents improved

All 20 numbered docs + `MASTER_INDEX.md` rewritten or tightened for:

- Shared **canonical facts** block  
- Consistent terminology (Phase A, decision calibration, LIVE/DORMANT, pre-revenue, Power Buyer)  
- Clearer Mermaid diagrams  
- Cross-links instead of repeating full inventories  
- Explicit gaps (`quantai_feedback`, `/analytics`)  
- M&A diligence tone (what to pay for / not pay for)  

---

## Remaining gaps buyers may ask about

| Gap | Why it remains |
|-----|----------------|
| Live production P50/P95 latency artifact attached to *this* folder | Numbers live in other docs/scripts; methodology must be re-run against buyer-controlled URL |
| Exact monthly COGS / invoices | Not in repository |
| Reason for sale / asking price | Seller commercial input |
| Whether production DB contains PII today | Environment-specific; not inferable from code alone |
| Full license/compliance scan of transitive npm deps | Needs tooling run (e.g. license checker) at diligence |
| End-to-end Stripe test-mode walkthrough recording | Operational demo artifact, not docs |
| Confirmation of remote git tag `quantai-sale-candidate-v1` tip | Verify on remote during diligence |
| Completeness of RLS policies vs service-role usage | Requires SQL + handler authz line-by-line review |
| Which dormant flags have ever been enabled in a deployed env | Deploy history / env dump — not fully knowable from code defaults alone |
| Mobile UX QA matrix | Responsive intent exists; dedicated device QA evidence not packaged here |

---

## Consistency check (post-audit)

| Fact | Value locked across docs |
|------|--------------------------|
| Pages | 12 |
| API route files | 21 |
| Migrations | 7 |
| Tables | 15 |
| Intelligence engines | 151 |
| Next / React | 16.2.4 / 19.2.4 |
| Plans | €0 / €19 / €49 (Power Buyer) |
| Auth file | `proxy.ts` |
| Commercial status | Pre-revenue |

---

## Production code

**Unchanged.** Documentation-only audit.
