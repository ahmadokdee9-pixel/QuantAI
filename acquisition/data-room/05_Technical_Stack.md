# 05 — Technical Stack

Canonical facts: [`MASTER_INDEX.md`](./MASTER_INDEX.md).

---

## Application

| Layer | Technology | Version in `package.json` |
|-------|------------|---------------------------|
| Framework | Next.js | `16.2.4` |
| UI | React / React DOM | `19.2.4` |
| Language | TypeScript | `^5` (devDependency) |
| Validation | Zod | `^4.4.3` |
| CSS | Tailwind CSS | `^4` (devDependency) |
| Motion / icons | Framer Motion, Lucide | `^12.38.0`, `^1.14.0` |
| Fonts | Geist | `^1.7.1` |

---

## Services

| Service | Integration | Role |
|---------|-------------|------|
| Clerk | `@clerk/nextjs` `^7.3.1` | Auth / sessions / `auth.protect` |
| Supabase | `@supabase/supabase-js` `^2.105.3` | Postgres + service-role server access |
| Stripe | `stripe` `^22.1.1` | Checkout, portal, webhooks |
| Upstash | `@upstash/redis` `^1.35.0`, `@upstash/ratelimit` `^2.0.5` | Optional distributed rate limits |
| OpenAI | `openai` `^6.36.0` | Compare / copilot / AI chat |
| SerpAPI | HTTP via `SERPAPI_KEY` (not an npm SDK) | Shopping discovery |

---

## Hosting & tooling

| Item | Evidence |
|------|----------|
| Deploy orientation | Vercel (`.vercel/`, `vercel.json`) |
| Cron | Daily `0 0 * * *` → `/api/cron/refresh-listings` |
| Next config | `next.config.ts` — empty options object |
| Auth middleware file | `proxy.ts` |
| Instrumentation | `instrumentation.ts` |
| Env template | `.env.example` |
| Safe env sync | `npm run env:pull` → `scripts/pull-env-safe.mjs` |
| CI Node | 20 (`.github/workflows/ci.yml`) |

---

## Proprietary vs commodity

| Proprietary product IP | Commodity / third-party |
|------------------------|-------------------------|
| Search orchestration, Phase A, calibration, diversity, truth stack, decision UI | Next.js, React, Clerk, Supabase, Stripe, SerpAPI, OpenAI, Upstash, Vercel |

---

## Note

Stack choice is conventional SaaS. Differentiator is application logic in `lib/` + search route—not a custom runtime.
