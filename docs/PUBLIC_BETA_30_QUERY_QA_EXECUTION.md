# 30-query QA — execution sheet (invite-only beta)

**Environment:** Production only (`https://quant-ai-app.vercel.app` or current canonical URL).  
**Pacing:** 2–3 seconds between searches; one browser session; guest unless row notes signed-in.  
**Pass bar:** ≥28/30 passes; ≤2 minor fails; **0** critical fails.

---

## How to execute

1. Open production URL in desktop Chrome (incognito = guest).
2. For each row: run search, wait for tray, score checklist below.
3. Mark **P** (pass), **F** (fail), or **S** (skip/sparse) in the Pass column.
4. Log failures in the defect table at the bottom.
5. Both Engineering and Product sign before invites.

**Automated pre-check (subset):**

```bash
SEARCH_BASE_URL=https://quant-ai-app.vercel.app npm run test:golden-search
SEARCH_BASE_URL=https://quant-ai-app.vercel.app npm run test:realworld
```

---

## Per-query checklist (apply to every row)

| # | Criterion | P/F |
|---|-----------|:---:|
| A | HTTP 200, JSON `success: true` | ☐ |
| B | ≥2 relevant products in top 10 (S if niche/AR sparse) | ☐ |
| C | No wrong-category pollution in top 5 | ☐ |
| D | Top 3 not duplicate same-merchant clones | ☐ |
| E | Outbound/merchant links on top 3 | ☐ |
| F | Tray loads in &lt; 10s perceived (guest) | ☐ |

**Critical fail (blocks beta):** empty tray on common SKU (rows 1–4, 7, 10, 27); luxury↔fitness pollution; broken save/compare for signed-in row.

---

## Execution table

**Automated run (2026-05-25):** see `docs/architecture-audit/beta-launch/PUBLIC_BETA_30_QUERY_QA_REPORT.md` and `public-beta-30-query-qa.json`.  
**Tester:** Agent/automated + manual visual pending  **Date:** 2026-05-25  **Build/SHA:** production

**Automated summary:** 16/30 strict · 28/30 functional · 0 critical · flows PASS (guest + signed-in cookie present)

| # | Query | Bucket | A | B | C | D | E | F | Pass |
|---|-------|--------|---|---|---|---|---|---|:----:|
| 1 | iphone 16 | electronics | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| 2 | airpods | electronics | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| 3 | gaming monitor for PS5 under 500 | electronics | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| 4 | iphone 15 pro max titanium | electronics | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| 5 | compare airpods pro vs airpods 4 | comparison | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| 6 | best premium headphones for focus | electronics | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| 7 | adidas samba | fashion | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| 8 | nike shoes like vomero but cheaper | fashion | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| 9 | minimal white sneakers like Common Projects | fashion | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| 10 | sofa | furniture | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| 11 | luxury looking sofa under 1000 | furniture | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| 12 | minimal desk setup | furniture | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| 13 | كنبة زاوية | furniture AR | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| 14 | كرسي office minimal | mixed AR/EN | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| 15 | كرسي مكتب مريح وفخم | furniture AR | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| 16 | iphone 15 برو max titanium | mixed AR/EN | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| 17 | luxury ساعة under 300 | luxury | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| 18 | ساعة شكلها luxury بس سعرها معقول | luxury AR | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| 19 | yves saint laurent libre edp 90ml | fragrance | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| 20 | جزمة مثل nike vomero بس ارخص | fashion AR | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| 21 | ايفون 16 رخيص | budget AR | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| 22 | سماعات ايربودز | budget AR | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| 23 | robot vacuum under 400 | home | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| 24 | cheap but luxury looking sofa | furniture | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| 25 | iphone 16 case | accessory | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| 26 | best headphones for focus | electronics | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| 27 | gaming monitor | electronics | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| 28 | robot vacuum under 400 | home | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| 29 | adidas samba white | fashion | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| 30 | luxury watch rolex style under 500 | luxury | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |

**Totals:** Pass _____ / 30 · Critical fails _____ · Minor fails _____

---

## Signed-in spot checks (same session, after guest pass)

| # | Flow | Pass |
|---|------|:----:|
| S1 | Sign in → search → save product | ☐ |
| S2 | Compare 2 products → verdict returns | ☐ |
| S3 | Dashboard loads saved list | ☐ |

---

## Defect log

| Query # | Severity (critical/minor) | Symptom | Ticket/link |
|---------|---------------------------|---------|-------------|
| | | | |

---

## Sign-off

| Role | Name | Date | Result |
|------|------|------|--------|
| Engineering | | | pass / fail |
| Product | | | pass / fail |

**Invite gate:** Both pass AND ≥28/30 AND zero critical defects.

Legacy reference: `docs/PUBLIC_BETA_30_QUERY_QA.md` (query list summary).
