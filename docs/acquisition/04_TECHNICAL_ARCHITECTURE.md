# 4. Technical Architecture Overview

---

## High-level architecture

```text
Client (Next.js / React)
  → Clerk session (when authenticated)
  → POST/GET /api/search
      → Abuse / rate limits (Upstash or memory fallback)
      → Guest operational stabilization
      → Discovery (SerpAPI shopping + bounded live discovery)
      → Enrichment (intelligence / truth / value signals)
      → Ranking preparation + Phase A canonical rank
      → Merchant diversity safeguards
      → Decision calibration
      → Response meta + products tray
  → Optional: compare-verdict, save, intelligence CRUD, Stripe, health
```

Persistence: **Supabase** (Postgres + service-role server access).  
Hosting target: **Vercel** (Next.js App Router).  
Discovery upstream: **SerpAPI** (critical).

---

## Pipeline stages (decision path)

| Stage | Responsibility | Primary evidence |
|-------|----------------|------------------|
| Discovery | Fetch multi-merchant offers | `fetchShopping`, live discovery helpers |
| Enrichment | Attach trust/value/relevance signals | `lib/intelligence/enrichProducts.ts` |
| Truth / RDR | Product identity & ranking decision records | `lib/truth/*` |
| Phase A | Canonical order authority | `lib/truth/canonicalSearchRank.ts` |
| Diversity | Prevent merchant collapse | `lib/search/merchantDiversityRerank.ts` |
| Calibration | Shopper labels + confidence | `lib/ui/canonicalDecisionCalibration.ts` |
| UI | Cards, brief, compare | `components/search/*` |
| Stabilization | Cache, stale-prefer, timeouts, circuit | `productionStabilization*` |

---

## System domains

| Domain | Components |
|--------|------------|
| Application | Next.js 16 App Router, React 19 |
| Auth | Clerk |
| Data | Supabase migrations (~16 tables across 7 migrations) |
| Billing | Stripe checkout, portal, webhook |
| Search API | Large orchestration route + shopping fetch |
| Intelligence estate | Many engines; **live core vs dormant flags** must be distinguished |
| Ops | Env manifests, health endpoint, cron refresh path, analytics sink (optional) |

---

## Live vs dormant

| Class | Meaning |
|-------|---------|
| **Live core** | Ranking authority, calibration, diversity, discount gating on path, stabilization, primary UI |
| **Dormant / shadow** | Feature-flagged experimental stacks (default OFF) — inventory for future activation, **not** sold as live capability |

Buyers should diligence against a **Production Capability Map**, not raw engine file counts.

---

## Non-functional characteristics

| Topic | Notes |
|-------|-------|
| Latency | Dominated by upstream discovery on cold/miss paths |
| Caching | Pipeline / guest caches; optional shared Redis (Upstash) for rate limits; shadow canonical response cache exists but **default OFF** |
| Scalability | Serverless-friendly; in-memory fallbacks weaken multi-instance consistency without Upstash |
| Portability | Schema portable; app patterns assume Clerk + Supabase + Vercel idioms |

---

## Architecture principle

**One ranking authority. One calibration pass. No second ad-hoc ranker in the UI.**  
That principle is the architectural moat of the live product.
