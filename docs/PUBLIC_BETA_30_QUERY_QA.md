# Public beta — 30-query manual QA

Run against **Production** with 2–3s between queries. Sign off each row before inviting users.

**Commands (automated subset):**

```bash
SEARCH_BASE_URL=https://YOUR_DOMAIN npm run test:golden-search
SEARCH_BASE_URL=https://YOUR_DOMAIN npm run test:realworld
```

## Criteria per query

- [ ] HTTP 200, `success: true`
- [ ] ≥2 relevant products in top 10 (unless niche/Arabic sparse)
- [ ] No obvious wrong-category pollution (e.g. fitness band on luxury watch query)
- [ ] Top 3 not dominated by duplicate same merchant listing
- [ ] Outbound links present on top results

| # | Query | Bucket | Pass |
|---|-------|--------|:----:|
| 1 | iphone 16 | electronics | ☐ |
| 2 | airpods | electronics | ☐ |
| 3 | gaming monitor for PS5 under 500 | electronics | ☐ |
| 4 | iphone 15 pro max titanium | electronics | ☐ |
| 5 | compare airpods pro vs airpods 4 | comparison | ☐ |
| 6 | best premium headphones for focus | electronics | ☐ |
| 7 | adidas samba | fashion | ☐ |
| 8 | nike shoes like vomero but cheaper | fashion | ☐ |
| 9 | minimal white sneakers like Common Projects | fashion | ☐ |
| 10 | sofa | furniture | ☐ |
| 11 | luxury looking sofa under 1000 | furniture | ☐ |
| 12 | minimal desk setup | furniture | ☐ |
| 13 | كنبة زاوية | furniture AR | ☐ |
| 14 | كرسي office minimal | mixed AR/EN | ☐ |
| 15 | كرسي مكتب مريح وفخم | furniture AR | ☐ |
| 16 | iphone 15 برو max titanium | mixed AR/EN | ☐ |
| 17 | luxury ساعة under 300 | luxury | ☐ |
| 18 | ساعة شكلها luxury بس سعرها معقول | luxury AR | ☐ |
| 19 | yves saint laurent libre edp 90ml | fragrance | ☐ |
| 20 | جزمة مثل nike vomero بس ارخص | fashion AR | ☐ |
| 21 | ايفون 16 رخيص | budget AR | ☐ |
| 22 | سماعات ايربودز | budget AR | ☐ |
| 23 | robot vacuum under 400 | home | ☐ |
| 24 | cheap but luxury looking sofa | furniture | ☐ |
| 25 | iphone 16 case | accessory | ☐ |
| 26 | best headphones for focus | electronics | ☐ |
| 27 | gaming monitor | electronics | ☐ |
| 28 | robot vacuum under 400 | home | ☐ |
| 29 | adidas samba white | fashion | ☐ |
| 30 | luxury watch rolex style under 500 | luxury | ☐ |

## Sign-off

| Role | Name | Date | Notes |
|------|------|------|-------|
| Engineering | | | |
| Product | | | |

**Block beta** if &gt;3 critical failures (empty tray on common SKUs, luxury/fitness pollution, broken Arabic intent).
