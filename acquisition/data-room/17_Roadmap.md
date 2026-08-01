# 17 — Roadmap

Canonical facts: [`MASTER_INDEX.md`](./MASTER_INDEX.md).  

Items below are **post-close guidance** grounded in repo reality — not committed delivery dates or shipped features.

---

## Horizon 0 (0–30 days) — Own & operate

| Priority | Work |
|----------|------|
| P0 | Execute [Transfer Checklist](./16_Transfer_Checklist.md) |
| P0 | Rotate secrets |
| P0 | Staging/prod env parity; warm demo queries |
| P0 | Measure live search latency with methodology |
| P1 | Enable Upstash if multi-instance |
| P1 | Re-read LIVE vs DORMANT map with engineering |

**Freeze:** Phase A, decision calibration, diversity path, primary results UI.

---

## Horizon 1 (30–90 days) — Reliability & monetization

| Priority | Work |
|----------|------|
| P0 | Latency/cost controls vs SerpAPI without changing rank semantics |
| P1 | Conversion polish on existing Stripe plans |
| P1 | Expand CI to acquisition-critical gates |
| P2 | Modularize `app/api/search/route.ts` |

---

## Horizon 2 (90–180 days) — Selective intelligence

| Priority | Work |
|----------|------|
| P1 | Enable **one** dormant flag family at a time with gates/canary |
| P1 | Add migration for `quantai_feedback` if productizing feedback |
| P2 | Vertical packaging via existing commerce-intelligence routes |
| P2 | Decision API spike |

**Anti-goal:** turn all dormant stacks ON at once.

---

## Horizon 3 (6–18 months) — Platform options

Consumer distribution; B2B embed; discovery diversification; deeper use of SKU/price observation tables.

---

## Non-goals during sale transition

Ranking rewrites for marketing; unverified traction claims; marketplace inventory build as a close prerequisite.
