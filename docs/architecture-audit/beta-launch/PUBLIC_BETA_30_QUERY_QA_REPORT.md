# Public beta 30-query QA report

**Generated:** 2026-05-25T23:58:57.270Z  
**Base URL:** https://quant-ai-app.vercel.app  
**Method:** Automated API QA (desktop + mobile User-Agent); HTML shell check for mobile/desktop pages. Visual mobile UI requires manual device pass.

## Final verdict: **FAIL**

| Metric | Value |
|--------|------:|
| Pass | 19 / 30 |
| Fail | 11 / 30 |
| Critical failures | 0 |

---

## 1. PASS/FAIL table

| # | Query | Lang | Verdict | Latency ms | Products | Mobile API | A–F | Issues |
|---|-------|------|---------|----------:|---------:|:----------:|-----|--------|
| 1 | iphone 16 | en | FAIL | 2535 | 20 | Y | A:✓ B:✓ C:✓ D:✗ E:✓ F:✓ | top3_near_duplicate_title |
| 2 | airpods | en | PASS | 1069 | 24 | Y | A:✓ B:✓ C:✓ D:✓ E:✓ F:✓ | — |
| 3 | gaming monitor for PS5 under 500 | en | PASS | 1539 | 19 | Y | A:✓ B:✓ C:✓ D:✓ E:✓ F:✓ | — |
| 4 | iphone 15 pro max titanium | en | PASS | 924 | 24 | Y | A:✓ B:✓ C:✓ D:✓ E:✓ F:✓ | — |
| 5 | compare airpods pro vs airpods 4 | en | FAIL | 2362 | 22 | Y | A:✓ B:✓ C:✓ D:✗ E:✓ F:✓ | top3_near_duplicate_title |
| 6 | best premium headphones for focus | en | PASS | 948 | 20 | Y | A:✓ B:✓ C:✓ D:✓ E:✓ F:✓ | — |
| 7 | adidas samba | en | PASS | 1130 | 26 | Y | A:✓ B:✓ C:✓ D:✓ E:✓ F:✓ | — |
| 8 | nike shoes like vomero but cheaper | en | FAIL | 944 | 22 | Y | A:✓ B:✓ C:✓ D:✗ E:✓ F:✓ | top3_same_merchant |
| 9 | minimal white sneakers like Common Projects | en | PASS | 607 | 11 | Y | A:✓ B:✓ C:✓ D:✓ E:✓ F:✓ | — |
| 10 | sofa | en | PASS | 1130 | 27 | Y | A:✓ B:✓ C:✓ D:✓ E:✓ F:✓ | — |
| 11 | luxury looking sofa under 1000 | en | FAIL | 1125 | 22 | Y | A:✓ B:✓ C:✓ D:✗ E:✓ F:✓ | top3_same_merchant |
| 12 | minimal desk setup | en | PASS | 1323 | 23 | Y | A:✓ B:✓ C:✓ D:✓ E:✓ F:✓ | — |
| 13 | كنبة زاوية | ar | FAIL | 1052 | 24 | Y | A:✓ B:✓ C:✓ D:✗ E:✓ F:✓ | top3_same_merchant |
| 14 | كرسي office minimal | mixed | FAIL | 996 | 24 | Y | A:✓ B:✓ C:✓ D:✗ E:✓ F:✓ | top3_same_merchant |
| 15 | كرسي مكتب مريح وفخم | ar | FAIL | 1186 | 24 | Y | A:✓ B:✓ C:✓ D:✗ E:✓ F:✓ | top3_same_merchant |
| 16 | iphone 15 برو max titanium | mixed | FAIL | 735 | 21 | Y | A:✓ B:✓ C:✓ D:✗ E:✓ F:✓ | top3_same_merchant |
| 17 | luxury ساعة under 300 | mixed | PASS | 1213 | 24 | Y | A:✓ B:✓ C:✓ D:✓ E:✓ F:✓ | — |
| 18 | ساعة شكلها luxury بس سعرها معقول | ar | PASS | 778 | 18 | Y | A:✓ B:✓ C:✓ D:✓ E:✓ F:✓ | — |
| 19 | yves saint laurent libre edp 90ml | en | PASS | 346 | 3 | Y | A:✓ B:✓ C:✓ D:✓ E:✓ F:✓ | — |
| 20 | جزمة مثل nike vomero بس ارخص | ar | FAIL | 967 | 23 | Y | A:✓ B:✓ C:✓ D:✗ E:✓ F:✓ | top3_same_merchant, top3_near_duplicate_title |
| 21 | ايفون 16 رخيص | ar | PASS | 693 | 18 | Y | A:✓ B:✓ C:✓ D:✓ E:✓ F:✓ | — |
| 22 | سماعات ايربودز | ar | PASS | 1069 | 24 | Y | A:✓ B:✓ C:✓ D:✓ E:✓ F:✓ | — |
| 23 | robot vacuum under 400 | en | PASS | 1408 | 24 | Y | A:✓ B:✓ C:✓ D:✓ E:✓ F:✓ | — |
| 24 | cheap but luxury looking sofa | en | FAIL | 986 | 23 | Y | A:✓ B:✓ C:✓ D:✗ E:✓ F:✓ | top3_same_merchant |
| 25 | iphone 16 case | en | PASS | 387 | 9 | Y | A:✓ B:✓ C:✓ D:✓ E:✓ F:✓ | — |
| 26 | best headphones for focus | en | PASS | 716 | 18 | Y | A:✓ B:✓ C:✓ D:✓ E:✓ F:✓ | — |
| 27 | gaming monitor | en | PASS | 800 | 20 | Y | A:✓ B:✓ C:✓ D:✓ E:✓ F:✓ | — |
| 28 | robot vacuum under 400 | en | PASS | 1015 | 24 | Y | A:✓ B:✓ C:✓ D:✓ E:✓ F:✓ | — |
| 29 | adidas samba white | en | PASS | 937 | 25 | Y | A:✓ B:✓ C:✓ D:✓ E:✓ F:✓ | — |
| 30 | luxury watch rolex style under 500 | en | FAIL | 881 | 24 | Y | A:✓ B:✓ C:✓ D:✗ E:✓ F:✓ | top3_same_merchant |

---

## 2. Broken queries

_None_

---

## 3. Duplicate issues

- **#1** `iphone 16` — top3_near_duplicate_title: 
- **#5** `compare airpods pro vs airpods 4` — top3_near_duplicate_title: 
- **#8** `nike shoes like vomero but cheaper` — top3_same_merchant: misterrunning.com×2
- **#11** `luxury looking sofa under 1000` — top3_same_merchant: ubuy×2
- **#13** `كنبة زاوية` — top3_same_merchant: homary.com×2
- **#14** `كرسي office minimal` — top3_same_merchant: ikea×2
- **#15** `كرسي مكتب مريح وفخم` — top3_same_merchant: b mart | منصة بي مارت للتسوق الإلكتروني×2
- **#16** `iphone 15 برو max titanium` — top3_same_merchant: back market×2
- **#20** `جزمة مثل nike vomero بس ارخص` — top3_same_merchant: misterrunning.com×2
- **#20** `جزمة مثل nike vomero بس ارخص` — top3_near_duplicate_title: 
- **#24** `cheap but luxury looking sofa` — top3_same_merchant: ubuy×2
- **#30** `luxury watch rolex style under 500` — top3_same_merchant: paganidesignwatches×2

---

## 4. Hallucination / trust cases

_None flagged_

---

## 5. Latency outliers (>10000ms)

_None_

---

## 6. Mobile UI / client issues

| Check | Desktop | Mobile UA |
|-------|---------|-----------|
| Home `/` | 200 OK (viewport: true) | 200 OK (viewport: true) |
| Search shell | — | 200 OK |

**Mobile API mismatches** (desktop OK, mobile tray worse):  
_None_

_Note: Layout/tap targets/card overflow require manual iPhone/Android pass — not evaluated by this script._

---

## 7. Search quality notes

_No additional quality flags beyond table._

---

## 8. Flow tests

| Flow | Result |
|------|--------|
| Guest search | PASS (20 products) |
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
