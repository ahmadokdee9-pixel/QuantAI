# SerpAPI & OpenAI — quota and cost alerts (public beta)

## SerpAPI

| Item | Action |
|------|--------|
| Dashboard | [serpapi.com/manage-api-key](https://serpapi.com/manage-api-key) |
| Plan | Ensure plan supports expected searches/day |
| Alert | Email alert at **70%** and **90%** monthly quota |
| Beta math | 100 users × 10 searches/day ≈ 1,000 searches/day |
| Failure mode | Search returns 503 / empty — monitor `/api/health` `serpapi: true` |

### Daily sanity

```bash
# After deploy
SEARCH_BASE_URL=https://YOUR_DOMAIN npm run test:beta-prod-smoke
```

## OpenAI

| Surface | Model env | Typical use |
|---------|-----------|-------------|
| Compare verdict | default API | Per compare session (auth) |
| Copilot / ai-chat | `QUANTAI_*_MODEL` | Optional; rate limited |

| Item | Action |
|------|--------|
| Dashboard | [platform.openai.com/usage](https://platform.openai.com/usage) |
| Hard limit | Set **monthly budget cap** + email notification |
| Beta cap | Free tier: limit compare (plan `compareMax: 3`) + low `aiIntelligencePerDay` |
| Failure mode | Compare 503; build still needs key at deploy time |

## Combined launch checklist

- [ ] SerpAPI quota ≥ 7 days at projected beta volume
- [ ] OpenAI budget cap enabled
- [ ] Owner on-call for 503 spikes on `/api/search` and `/api/search/compare-verdict`
- [ ] Log drain wired (Vercel → Axiom/Datadog) for `upstream_fail` / `SEARCH_FAILED`

## Cost guardrails (recommended)

| Users | SerpAPI | OpenAI |
|------:|---------|--------|
| 10 internal | Manual watch | Minimal |
| 100 invite | 70% alert | $50–100 cap |
| 1000 | Upgrade plan | Review compare volume weekly |
