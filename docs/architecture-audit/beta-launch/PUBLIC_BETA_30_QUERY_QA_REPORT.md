# Public beta 30-query QA report

**Generated:** 2026-06-03T01:02:40.102Z  
**Base URL:** https://quant-ai-app.vercel.app  
**Method:** Automated API QA (desktop + mobile User-Agent); HTML shell check for mobile/desktop pages. Visual mobile UI requires manual device pass.

## Final verdict: **FAIL**

| Metric | Value |
|--------|------:|
| Pass | 10 / 30 |
| Fail | 15 / 30 |
| Critical failures | 5 |

---

## 1. PASS/FAIL table

| # | Query | Lang | Verdict | Latency ms | Products | Mobile API | A–F | Issues |
|---|-------|------|---------|----------:|---------:|:----------:|-----|--------|
| 1 | iphone 16 | en | FAIL | 2923 | 14 | Y | A:✓ B:✓ C:✓ D:✗ E:✓ F:✓ | top3_near_duplicate_title |
| 2 | airpods | en | FAIL | 1292 | 24 | Y | A:✓ B:✓ C:✓ D:✗ E:✓ F:✓ | top3_same_merchant |
| 3 | gaming monitor for PS5 under 500 | en | FAIL | 1378 | 21 | Y | A:✓ B:✓ C:✓ D:✗ E:✓ F:✓ | top3_same_merchant |
| 4 | iphone 15 pro max titanium | en | PASS | 900 | 25 | Y | A:✓ B:✓ C:✓ D:✓ E:✓ F:✓ | — |
| 5 | compare airpods pro vs airpods 4 | en | PASS | 1016 | 22 | Y | A:✓ B:✓ C:✓ D:✓ E:✓ F:✓ | — |
| 6 | best premium headphones for focus | en | PASS | 694 | 19 | Y | A:✓ B:✓ C:✓ D:✓ E:✓ F:✓ | — |
| 7 | adidas samba | en | SKIP | 1328 | 0 | N | A:✗ B:✗ C:✓ D:✓ E:✗ F:✓ | empty_tray, error_state |
| 8 | nike shoes like vomero but cheaper | en | SKIP | 5963 | 0 | N | A:✗ B:✗ C:✓ D:✓ E:✗ F:✓ | empty_tray, error_state |
| 9 | minimal white sneakers like Common Projects | en | SKIP | 2116 | 0 | N | A:✗ B:✗ C:✓ D:✓ E:✗ F:✓ | empty_tray, error_state |
| 10 | sofa | en | SKIP | 1146 | 0 | N | A:✗ B:✗ C:✓ D:✓ E:✗ F:✓ | empty_tray, error_state |
| 11 | luxury looking sofa under 1000 | en | SKIP | 2099 | 0 | N | A:✗ B:✗ C:✓ D:✓ E:✗ F:✓ | empty_tray, error_state |
| 12 | minimal desk setup | en | PASS | 1050 | 24 | Y | A:✓ B:✓ C:✓ D:✓ E:✓ F:✓ | — |
| 13 | كنبة زاوية | ar | FAIL | 5243 | 25 | Y | A:✓ B:✓ C:✓ D:✗ E:✓ F:✓ | top3_same_merchant |
| 14 | كرسي office minimal | mixed | FAIL | 4871 | 24 | Y | A:✓ B:✓ C:✓ D:✗ E:✓ F:✓ | top3_same_merchant |
| 15 | كرسي مكتب مريح وفخم | ar | FAIL | 15411 | 24 | Y | A:✓ B:✓ C:✓ D:✗ E:✓ F:✗ | top3_same_merchant |
| 16 | iphone 15 برو max titanium | mixed | FAIL | 363 | 13 | Y | A:✓ B:✓ C:✓ D:✗ E:✓ F:✓ | top3_near_duplicate_title |
| 17 | luxury ساعة under 300 | mixed | FAIL | 661 | 23 | Y | A:✓ B:✓ C:✓ D:✗ E:✓ F:✓ | top3_same_merchant |
| 18 | ساعة شكلها luxury بس سعرها معقول | ar | FAIL | 2582 | 9 | Y | A:✓ B:✓ C:✓ D:✗ E:✓ F:✓ | top3_same_merchant |
| 19 | yves saint laurent libre edp 90ml | en | FAIL | 5272 | 3 | Y | A:✓ B:✓ C:✓ D:✗ E:✓ F:✓ | top3_near_duplicate_title |
| 20 | جزمة مثل nike vomero بس ارخص | ar | FAIL | 1017 | 24 | Y | A:✓ B:✓ C:✓ D:✗ E:✓ F:✓ | top3_same_merchant, top3_near_duplicate_title |
| 21 | ايفون 16 رخيص | ar | FAIL | 5165 | 4 | Y | A:✓ B:✓ C:✓ D:✗ E:✓ F:✓ | top3_same_merchant |
| 22 | سماعات ايربودز | ar | PASS | 3858 | 26 | Y | A:✓ B:✓ C:✓ D:✓ E:✓ F:✓ | — |
| 23 | robot vacuum under 400 | en | PASS | 6027 | 10 | Y | A:✓ B:✓ C:✓ D:✓ E:✓ F:✓ | — |
| 24 | cheap but luxury looking sofa | en | PASS | 9329 | 23 | Y | A:✓ B:✓ C:✓ D:✓ E:✓ F:✓ | — |
| 25 | iphone 16 case | en | PASS | 4096 | 7 | Y | A:✓ B:✓ C:✓ D:✓ E:✓ F:✓ | — |
| 26 | best headphones for focus | en | PASS | 6475 | 15 | Y | A:✓ B:✓ C:✓ D:✓ E:✓ F:✓ | — |
| 27 | gaming monitor | en | FAIL | 4224 | 21 | Y | A:✓ B:✓ C:✓ D:✗ E:✓ F:✓ | top3_same_merchant |
| 28 | robot vacuum under 400 | en | PASS | 539 | 10 | Y | A:✓ B:✓ C:✓ D:✓ E:✓ F:✓ | — |
| 29 | adidas samba white | en | FAIL | 14931 | 25 | Y | A:✓ B:✓ C:✓ D:✓ E:✓ F:✗ | — |
| 30 | luxury watch rolex style under 500 | en | FAIL | 4325 | 23 | Y | A:✓ B:✓ C:✓ D:✗ E:✓ F:✓ | top3_same_merchant |

---

## 2. Broken queries

_None_

---

## 3. Duplicate issues

- **#1** `iphone 16` — top3_near_duplicate_title: 
- **#2** `airpods` — top3_same_merchant: apple×2
- **#3** `gaming monitor for PS5 under 500` — top3_same_merchant: amazon.nl - seller×3
- **#13** `كنبة زاوية` — top3_same_merchant: bol.com×2
- **#14** `كرسي office minimal` — top3_same_merchant: ikea×3
- **#15** `كرسي مكتب مريح وفخم` — top3_same_merchant: cellbell.in×2
- **#16** `iphone 15 برو max titanium` — top3_near_duplicate_title: 
- **#17** `luxury ساعة under 300` — top3_same_merchant: made-in-china.com×2
- **#18** `ساعة شكلها luxury بس سعرها معقول` — top3_same_merchant: miss trend×2
- **#19** `yves saint laurent libre edp 90ml` — top3_near_duplicate_title: 
- **#20** `جزمة مثل nike vomero بس ارخص` — top3_same_merchant: misterrunning.com×3
- **#20** `جزمة مثل nike vomero بس ارخص` — top3_near_duplicate_title: 
- **#21** `ايفون 16 رخيص` — top3_same_merchant: ebay - yywirelesss×2
- **#27** `gaming monitor` — top3_same_merchant: amazon.nl - seller×2
- **#30** `luxury watch rolex style under 500` — top3_same_merchant: paganidesignwatches×2

---

## 4. Hallucination / trust cases

_None flagged_

---

## 5. Latency outliers (>10000ms)

- **#15** `كرسي مكتب مريح وفخم` — **15411ms** (mobile 1206ms)
- **#29** `adidas samba white` — **14931ms** (mobile 505ms)

---

## 6. Mobile UI / client issues

| Check | Desktop | Mobile UA |
|-------|---------|-----------|
| Home `/` | 200 OK (viewport: true) | 200 OK (viewport: true) |
| Search shell | — | 200 OK |

**Mobile API mismatches** (desktop OK, mobile tray worse):  
- #7 `adidas samba`
- #8 `nike shoes like vomero but cheaper`
- #9 `minimal white sneakers like Common Projects`
- #10 `sofa`
- #11 `luxury looking sofa under 1000`

_Note: Layout/tap targets/card overflow require manual iPhone/Android pass — not evaluated by this script._

---

## 7. Search quality notes

_No additional quality flags beyond table._

---

## 8. Flow tests

| Flow | Result |
|------|--------|
| Guest search | PASS (26 products) |
| Guest save (expect 401) | PASS status=401 |
| Guest compare (expect 401) | PASS status=401 |
| Outbound redirect | PASS 302 |
| Signed-in save | PASS |
| Signed-in compare | PASS |

---

## Sign-off

| Role | Result |
|------|--------|
| Automated QA | **FAIL** |
| Product manual (visual mobile) | Pending |
