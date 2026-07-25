# QuantAI — Golden buyer demo queries

**Purpose:** Fixed 10-query pack for acquisition demos. Exercises the **real** production pipeline — no hardcoded fake outputs.  
**Operator:** Warm each query once before the buyer call (`docs/DEMO_LATENCY_PROOF.md`).

---

## How to use

1. Staging/production URL with **CORE DEMO** env complete (`docs/ENVIRONMENT.md`).  
2. Use **default “value” sort** (preserves Phase A server order).  
3. For each query, observe qualitative behavior only — live prices/merchants vary by market (`SERPAPI_SHOPPING_GL`) and time.  
4. Do **not** claim specific SKUs, prices, or that every label appears on every run.

---

## Query pack

### 1. `MacBook Pro 14`

| Field | Content |
|-------|---------|
| **Demonstrates** | Multi-merchant laptop coverage; high-intent electronics; Phase A order + calibrated labels |
| **Expected qualitative behavior** | Multiple retailers when feed allows; grid #1 not AVOID under normal match; mix of BUY/COMPARE rather than all AVOID |
| **Must NOT claim** | Exact Apple Store exclusivity; specific M-series inventory; guaranteed BEST VALUE |

### 2. `iPhone 15 Pro 256GB`

| Field | Content |
|-------|---------|
| **Demonstrates** | Phone category; price/value spread; COMPARE alternatives |
| **Expected qualitative behavior** | Relevant Pro-oriented listings ranked ahead of clear mismatches; confidence spread across tray |
| **Must NOT claim** | Carrier lock status; regional stock; “cheapest on earth” |

### 3. `OLED TV 55 inch`

| Field | Content |
|-------|---------|
| **Demonstrates** | TV category; discount/value path when verified evidence exists; weak budget LED may AVOID |
| **Expected qualitative behavior** | OLED-oriented offers preferred over unrelated LEDs when identity holds; chips only if verified discount proof exists |
| **Must NOT claim** | A discount chip on every card; panel warranty details |

### 4. `corner sofa`

| Field | Content |
|-------|---------|
| **Demonstrates** | Furniture; quality vs cheap weak listing; multi-merchant home retail |
| **Expected qualitative behavior** | Valid sofas COMPARE/BUY mix; leader not forced to cheapest junk; not all AVOID |
| **Must NOT claim** | Fabric composition accuracy from title alone; delivery SLA |

### 5. `Sony WH-1000XM5`

| Field | Content |
|-------|---------|
| **Demonstrates** | Model-specific match; merchant diversity for same product |
| **Expected qualitative behavior** | Same model across stores when feed returns them; cross-merchant offers not collapsed solely for similar price |
| **Must NOT claim** | Official Sony MSRP; fake “40% off” without verified evidence |

### 6. `Dyson V15`

| Field | Content |
|-------|---------|
| **Demonstrates** | Brand+model vacuum; discount authenticity caution (high fake-discount category risk) |
| **Expected qualitative behavior** | Relevant V15-family listings; promotional wording only when authenticity path allows |
| **Must NOT claim** | Every markdown is real; accessory kits are the vacuum |

### 7. `gaming laptop under 1500`

| Field | Content |
|-------|---------|
| **Demonstrates** | Budget constraint language; mismatch demotion (ultrabook vs gaming) |
| **Expected qualitative behavior** | Gaming-oriented machines preferred; clear non-gaming ultrabooks demoted when constraints fire |
| **Must NOT claim** | Exact €1500 hard filter in all markets; FPS benchmarks |

### 8. `Adidas Samba`

| Field | Content |
|-------|---------|
| **Demonstrates** | Fashion/footwear; retailer diversity; top-slot merchant concentration control |
| **Expected qualitative behavior** | Multiple sellers when available; diversity safeguard limits single-merchant domination in top slots |
| **Must NOT claim** | Authenticity of every marketplace seller; size availability |

### 9. `standing desk under 400`

| Field | Content |
|-------|---------|
| **Demonstrates** | Home office; price-cap intent; COMPARE set |
| **Expected qualitative behavior** | Desks near budget band when feed allows; over-budget without value justification less likely BUY |
| **Must NOT claim** | Assembly quality; weight rating from title |

### 10. `robot vacuum`

| Field | Content |
|-------|---------|
| **Demonstrates** | Broad category discovery; COMPARE/BUY mix; avoid junk accessories if identity gate works |
| **Expected qualitative behavior** | Vacuum robots in tray; accessory-only noise reduced when identity signals fire |
| **Must NOT claim** | Mapping feature parity; “best robot 2026” editorial ranking |

---

## Suggested live demo script (5 minutes)

1. Warm queries **1, 3, 5** before the call.  
2. Run **MacBook Pro 14** → show multi-merchant + label on #1.  
3. Run **OLED TV 55 inch** → point at decision labels + any verified discount chip (only if present).  
4. Open **Compare** on two cards → Decision Brief / compare lane.  
5. Optional signed-in: **Saved** on one product (Clerk).  
6. If a query is slow: explain stabilization / warm cache — do not refresh spam.

---

## Capabilities coverage matrix

| Capability | Queries |
|------------|---------|
| Multi-merchant | 1, 5, 8 |
| BUY / COMPARE mix | 1, 2, 4, 10 |
| AVOID / demotion path | 3 (weak LED), 7 (mismatch) |
| BEST VALUE | May appear when value/discount signals strong — **not guaranteed every run** (try 3, 5) |
| Verified discount path | 3, 6 — **only if evidence exists** |
| Merchant diversity | 5, 8 |
| Compare flow | Any with ≥2 solid cards — prefer 1 or 5 |
| Furniture / non-electronics | 4, 9 |

---

## What must NOT be claimed (global)

- Hardcoded prices or merchants in diligence slides  
- That all 200+ intelligence engines are “live”  
- Inventory ownership  
- Guaranteed label counts per query  
- Sub-second search SLA
