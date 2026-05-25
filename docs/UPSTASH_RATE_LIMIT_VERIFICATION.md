# Upstash / rate-limit verification — public beta

## Why it matters

Without Upstash, Vercel serverless instances use **in-memory** rate limits (`lib/rate-limit.ts`). Limits are **not shared** across instances — abuse caps are weaker and inconsistent.

`/api/health` warns in Production when Upstash is missing.

## Limits (when Redis configured)

| Route | Limit |
|-------|-------|
| Search (auth) | 60 / hour / user |
| Search (guest) | 32–45 / hour / IP (memory fallback) |
| Compare verdict | 30 / hour / user |
| Copilot | 50 / hour |
| AI chat | 40 / hour |

## Checklist

- [ ] Create Upstash Redis database (REST API enabled)
- [ ] Set `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` on Vercel **Production**
- [ ] Redeploy Production
- [ ] `GET /api/health` → `services.upstash: true`
- [ ] No warning: `UPSTASH_REDIS not configured`
- [ ] Run `npm run test:beta-upstash` with `SEARCH_BASE_URL` set

## Commands

```bash
# Local keys + optional ping
npm run test:beta-upstash

# Production health
curl -s https://YOUR_DOMAIN/api/health | jq .services.upstash
```

## Guard in CI / pre-launch

```bash
REQUIRE_UPSTASH=true SEARCH_BASE_URL=https://YOUR_DOMAIN npm run test:beta-upstash
```

Fails if Production health reports `upstash: false` when `REQUIRE_UPSTASH=true`.
