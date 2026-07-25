# QuantAI — Buyer Demo Script (5–7 minutes)

**Audience:** Technical acquirer / CTO diligence  
**Prerequisite:** Deployed or local CORE DEMO env (`docs/LIVE_DEMO_READINESS.md`). Warm queries **before** the call.  
**Queries:** Subset of [`GOLDEN_DEMO_QUERIES.md`](./GOLDEN_DEMO_QUERIES.md)  
**Sort:** Keep default **value** (Phase A server order).

**Do not** promise specific SKUs, prices, discount chips on every card, or sub-second first search.

---

## Pre-call (seller, ~3 minutes)

1. Confirm app loads (production URL preferred).  
2. Warm: `MacBook Pro 14`, `OLED TV 55 inch`, `Sony WH-1000XM5`.  
3. Optional: sign in once if showing Saved.  
4. Have Compare tray ready (empty).  

---

## Minute 0:00–0:45 — Framing

| Field | Content |
|-------|---------|
| **ACTION** | State: “QuantAI is a commerce **decision engine** on multi-merchant offers — not a catalog we own.” |
| **EXPECTED SURFACE** | Homepage / hero search |
| **BUYER VALUE** | Sets honest expectations; avoids inventory-ownership trap |
| **TECHNICAL MOAT** | Positioning for ranking + calibration (not SerpAPI itself) |

---

## Minute 0:45–2:15 — Query 1: `MacBook Pro 14`

| Field | Content |
|-------|---------|
| **ACTION** | Run search; wait for tray; point at grid order and #1 label/confidence |
| **EXPECTED SURFACE** | Product cards; labels BUY/COMPARE (not all AVOID under normal match); multiple stores when feed allows |
| **BUYER VALUE** | Sees decision surface immediately |
| **TECHNICAL MOAT** | Phase A canonical order + decision calibration |

---

## Minute 2:15–3:30 — Query 2: `Sony WH-1000XM5`

| Field | Content |
|-------|---------|
| **ACTION** | Search model-specific query; highlight same model across merchants if present |
| **EXPECTED SURFACE** | Multi-merchant tray; diversity without collapsing useful alternatives |
| **BUYER VALUE** | Cross-retailer comparison is the product |
| **TECHNICAL MOAT** | Merchant-preserving ingest + diversity safeguards |

---

## Minute 3:30–4:45 — Query 3: `OLED TV 55 inch`

| Field | Content |
|-------|---------|
| **ACTION** | Search; if a verified discount chip appears, show it; if not, say “chips only when evidence is credible” |
| **EXPECTED SURFACE** | OLED-relevant offers; possible AVOID on weak mismatch/budget LED; optional discount chip |
| **BUYER VALUE** | Trust on promotions (anti–fake sale) |
| **TECHNICAL MOAT** | Discount authenticity / verified-only display path |

---

## Minute 4:45–5:45 — Compare

| Field | Content |
|-------|---------|
| **ACTION** | Select 2 cards from MacBook or headphones → open Compare / Decision Brief alignment |
| **EXPECTED SURFACE** | Compare panel; leader consistent with grid #1 when wired |
| **BUYER VALUE** | Decision consistency across surfaces |
| **TECHNICAL MOAT** | Phase A cross-surface rank authority |

---

## Minute 5:45–6:30 — Optional Saved (if signed in)

| Field | Content |
|-------|---------|
| **ACTION** | Save one product; open Saved |
| **EXPECTED SURFACE** | Persisted item (Clerk + Supabase) |
| **BUYER VALUE** | Retention / account value beyond search |
| **TECHNICAL MOAT** | Supporting infra (not core ranking moat) — show briefly |

**Skip if auth friction would burn time.**

---

## Minute 6:30–7:00 — Close / diligence handoff

| Field | Content |
|-------|---------|
| **ACTION** | Open `docs/BUYER_DATA_ROOM.md` / `LIVE_CAPABILITY_MAP.md`; state dormant layers are OFF |
| **EXPECTED SURFACE** | Docs or verbal |
| **BUYER VALUE** | Trust through disclosure |
| **TECHNICAL MOAT** | Engineering honesty = lower diligence risk |

---

## Fallback if search is slow or empty

| Situation | Script |
|-----------|--------|
| Slow first search | “Upstream SerpAPI-bound; warm cache/stale-prefer protects repeats — see PERFORMANCE_EVIDENCE.” Do not spam refresh. |
| Empty tray | Check SerpAPI quota/status; do not invent products. |
| No discount chip | Correct behavior when evidence weak — do not force a “deal” narrative. |

---

## Queries deliberately not used in the 7-minute core

Keep in reserve: `corner sofa`, `gaming laptop under 1500`, `Adidas Samba`, `Dyson V15`, `standing desk under 400`, `robot vacuum`, `iPhone 15 Pro 256GB` — use if buyer asks for furniture/fashion/budget-constraint depth.
