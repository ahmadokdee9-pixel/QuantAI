# Screenshot Plan — QuantAI Public Listing

**Goal:** 8–12 screenshots that sell the product honestly without exposing secrets, private admin data, or overclaiming.  
**Browser:** Chromium/Chrome latest · disable extensions · clear personal profile  
**Default viewport:** 1440×900 (desktop) unless noted  

---

## Global hide rules (every public shot)

**Must hide / avoid**

- Browser bookmarks bar with private links  
- Clerk/user email if it looks like a real personal inbox identity you do not want public (use a demo account)  
- Any env panels, terminal, `.env`, API keys, tokens  
- Stripe dashboard, Supabase dashboard, Vercel dashboard  
- Network tab request URLs with keys  
- Error stacks, rate-limit dumps, raw debug meta  
- Customer PII, saved lists belonging to real users  
- Internal architecture diagrams with file paths (keep those NDA-only)  

**Safe to show**

- Public marketing UI  
- Search results with merchant names/prices as returned by the live product  
- Decision labels and compare UI  
- Pricing page (plans, not secret price IDs)  

---

## Shot checklist

### 1. Homepage hero
| Field | Value |
|-------|--------|
| Page/surface | `/` homepage |
| Must be visible | Brand **QuantAI**, primary search input, clean hero, one clear CTA |
| Must be hidden | Debug banners, localhost URL if avoidable (prefer production/staging hostname), personal account menu clutter |
| Dimensions | 1440×900 |
| Caption | “QuantAI homepage — search-first commerce decisions” |
| Listing position | #1 (cover) |
| Disclosure | **Public** |

### 2. Search in progress / loading (optional but useful)
| Field | Value |
|-------|--------|
| Page/surface | Search results loading state |
| Must be visible | Query text, intentional loading/empty-professional state |
| Must be hidden | Raw spinner-only awkward crop; console errors |
| Dimensions | 1440×900 |
| Caption | “Search starts from a single shopper query” |
| Listing position | #2 |
| Disclosure | **Public** |

### 3. Results grid with decision labels
| Field | Value |
|-------|--------|
| Page/surface | Search results after a warm multi-merchant query |
| Must be visible | Product cards, prices, merchants, **BUY / COMPARE / BEST VALUE / AVOID** (or equivalent live labels), confidence if shown |
| Must be hidden | Internal meta JSON, pipeline traces, cache headers overlay |
| Dimensions | 1440×900 |
| Caption | “Calibrated decisions on multi-merchant results” |
| Listing position | #3 (hero proof) |
| Disclosure | **Public** |

### 4. Decision brief / top recommendation
| Field | Value |
|-------|--------|
| Page/surface | Results — decision brief / top recommendation panel |
| Must be visible | Recommended product aligned with top results, clear label |
| Must be hidden | Engineering jargon (“Phase A”, file names) |
| Dimensions | 1440×900 |
| Caption | “One coherent recommendation — not conflicting sorts” |
| Listing position | #4 |
| Disclosure | **Public** |

### 5. Merchant diversity visible
| Field | Value |
|-------|--------|
| Page/surface | Same or second results view scrolled to show multiple stores |
| Must be visible | At least 2–3 distinct merchants in top results |
| Must be hidden | Claims of “exclusive partners” |
| Dimensions | 1440×900 |
| Caption | “Cross-merchant alternatives preserved” |
| Listing position | #5 |
| Disclosure | **Public** |

### 6. Verified discount / value cue (only if truly visible)
| Field | Value |
|-------|--------|
| Page/surface | Results card showing discount chip / value note **when product shows it** |
| Must be visible | Discount/value cue that the UI actually renders |
| Must be hidden | Fake markup; do not photoshop discounts |
| Dimensions | 1440×900 |
| Caption | “Credible promotion emphasis when evidence supports it” |
| Listing position | #6 |
| Disclosure | **Public** (skip if not genuinely on screen) |

### 7. Comparison flow
| Field | Value |
|-------|--------|
| Page/surface | Compare tray / compare intelligence panel with 2–3 products |
| Must be visible | Side-by-side or tray compare, clear winner/guidance if shown |
| Must be hidden | Broken empty compare; API error toasts |
| Dimensions | 1440×900 |
| Caption | “Compare alternatives with decision context” |
| Listing position | #7 |
| Disclosure | **Public** |

### 8. Saved products (authenticated demo account)
| Field | Value |
|-------|--------|
| Page/surface | `/saved` or saved panel |
| Must be visible | A few demo-saved products, clean empty-or-populated state |
| Must be hidden | Real personal shopping history; other users’ data |
| Dimensions | 1440×900 |
| Caption | “Save products for follow-through” |
| Listing position | #8 |
| Disclosure | **Public** (use demo account only) |

### 9. Pricing page
| Field | Value |
|-------|--------|
| Page/surface | `/pricing` |
| Must be visible | Plan names and public prices as shown in UI |
| Must be hidden | Stripe dashboard, webhook secrets, price ID strings |
| Dimensions | 1440×900 |
| Caption | “Subscription foundation ready for monetization” |
| Listing position | #9 |
| Disclosure | **Public** |

### 10. How it works / product story
| Field | Value |
|-------|--------|
| Page/surface | `/how-it-works` (or equivalent public explainer) |
| Must be visible | Clear buyer-friendly explanation of decision flow |
| Must be hidden | Internal phase numbers that sound like vaporware |
| Dimensions | 1440×900 |
| Caption | “How QuantAI turns search into a decision” |
| Listing position | #10 |
| Disclosure | **Public** |

### 11. Commerce intelligence marketing page
| Field | Value |
|-------|--------|
| Page/surface | `/commerce-intelligence` (public narrative page) |
| Must be visible | High-level positioning only |
| Must be hidden | Claims that every experimental engine is live; internal diagrams with repo paths |
| Dimensions | 1440×900 |
| Caption | “Commerce intelligence positioning” |
| Listing position | #11 |
| Disclosure | **Public** (keep claims conservative) |

### 12. Dashboard / analytics (conditional)
| Field | Value |
|-------|--------|
| Page/surface | `/dashboard` or `/analytics` **only if genuinely operational with non-sensitive demo data** |
| Must be visible | Clean operational UI |
| Must be hidden | Empty broken charts; real user analytics; cost ledgers |
| Dimensions | 1440×900 |
| Caption | “Operator dashboard” |
| Listing position | #12 |
| Disclosure | **Public if solid**, else **omit** or keep **NDA-only** |

---

## NDA-only visuals (do not put on public marketplaces)

| Shot | Why NDA-only |
|------|----------------|
| Architecture one-pager with internal module map | Diligence depth |
| Offline gate output screenshots | Easy to misread as marketing proof |
| Latency probe tables | Need context; avoid public SLA implication |
| Env checklist (redacted) | Still operationally sensitive |
| Admin / Stripe / Supabase consoles | Secrets & account exposure risk |

---

## Capture sequence (recommended)

1. Warm the app with the three safe demo searches (see demo script)  
2. Shoot homepage → results → brief → diversity → compare → saved → pricing → how-it-works  
3. Export PNG or high-quality JPEG; no watermarks with private emails  
4. Store masters outside git if they contain account UI; listing copies must be scrubbed  

**Seller action:** Capture and attach; this repo kit only defines the plan.
