# 14. Roadmap

**Audience:** Acquirer planning post-close work  
**Constraint:** Pre-sale freeze of ranking/calibration/UI remains the recommended posture until ownership transfers.

---

## Horizon 0 — Close & operate (0–30 days)

| Priority | Workstream |
|----------|------------|
| P0 | Complete account transfers / recreations (Vercel, Clerk, Supabase, Stripe, SerpAPI, OpenAI, DNS) |
| P0 | Rotate all secrets |
| P0 | Confirm Supabase migrations applied |
| P0 | Stand up reliable staging with warm demo query pack |
| P0 | Attach live latency probe artifact for honesty in diligence |
| P1 | README / naming clarity for operators |
| P1 | Enable Upstash for multi-instance rate limits if multi-node |

---

## Horizon 1 — Reliability & conversion (30–90 days)

| Priority | Workstream |
|----------|------------|
| P0 | Latency program (cache strategy, warm paths, upstream budgeting) — **without** changing Phase A semantics |
| P1 | Subscription conversion funnel polish |
| P1 | Affiliate / partner exploration (compliance-first) |
| P1 | Expand acquisition CI gate coverage carefully |
| P2 | Modularize search route post-freeze (engineering hygiene) |

---

## Horizon 2 — Selective intelligence activation (90–180 days)

| Priority | Workstream |
|----------|------------|
| P1 | Activate **one** dormant layer at a time behind flags |
| P1 | Require offline gates + shadow metrics before mutation |
| P2 | Vertical packaging (category landing experiences) |
| P2 | Decision API spike for B2B/embed thesis |

**Anti-goal:** Turning all shadow stacks ON simultaneously.

---

## Horizon 3 — Platform options (6–18 months)

| Option | Outcome |
|--------|---------|
| Consumer scale | Distribution + SEO + retention loops |
| B2B middleware | Rank/calibrate API with SLAs |
| Strategic embed | Integration into acquirer properties |
| Discovery diversification | Reduce SerpAPI concentration |

---

## Explicit non-goals (especially pre-close)

- Ranking architecture rewrites  
- UI redesigns for their own sake  
- Marketplace build-out  
- Claiming unverified traction  
- Enabling experimental stacks for marketing theater  

---

## Freeze reminder

Until acquisition closes (and typically immediately after), preserve:

- Phase A canonical ranking  
- Decision calibration  
- Merchant diversity / verified discount paths  
- Primary results UI behavior  

Improve **ops, latency, packaging, GTM** first.
