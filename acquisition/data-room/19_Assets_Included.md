# 19 — Assets Included

Canonical facts: [`MASTER_INDEX.md`](./MASTER_INDEX.md).

---

## Typically included (code / IP deal)

| Asset | Evidence |
|-------|----------|
| Application source | `app/`, `components/`, `lib/`, `proxy.ts`, configs |
| Database migrations | `supabase/migrations/` (7 → 15 tables) |
| Scripts & gates | `scripts/`, `package.json` `test:*` |
| Documentation | `docs/`, `acquisition/data-room/` |
| Legal draft | `LICENSE` |
| Deploy hints | `vercel.json`, GitHub workflows |
| Static assets | `public/` |
| Plans / Stripe wiring | `lib/subscription/*`, `lib/stripe/*`, `/api/stripe/*` |
| Ranking / intelligence IP | `lib/truth`, `lib/ranking`, `lib/intelligence`, `lib/ui`, `lib/search`, … |

---

## Negotiated separately

Git hosting ownership; domain/DNS; Vercel project; Clerk app/users; Supabase project/data; Stripe account; SerpAPI/OpenAI/Upstash accounts; production secrets; analytics sink.

---

## Not included / not evidenced

| Item | Status |
|------|--------|
| Owned product catalog | Not owned |
| Exclusive retailer contracts | Not evidenced |
| Verified revenue book | Not evidenced |
| Patents | Not claimed here |
| Native mobile apps | Not evidenced |
| Finished `/analytics` product | Placeholder page only |
| Guaranteed readiness of dormant flags | Explicitly not |

---

## Related packs

| Pack | Path |
|------|------|
| This data room | `acquisition/data-room/` |
| Seller narrative | `docs/acquisition/` |
| Public listing kit | `docs/sale-launch/` |
| LIVE map | `docs/LIVE_CAPABILITY_MAP.md` |
