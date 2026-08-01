# 15 — Repository Structure

Canonical facts: [`MASTER_INDEX.md`](./MASTER_INDEX.md).

---

## Top level (product-relevant)

| Path | Purpose |
|------|---------|
| `app/` | App Router pages + API |
| `components/` | React UI (23 directories) |
| `lib/` | Domain logic (42 directories) |
| `supabase/migrations/` | 7 SQL migrations |
| `scripts/` | Tests, env tools, probes |
| `docs/` | Ops + acquisition docs |
| `acquisition/data-room/` | This diligence pack |
| `public/` | Static assets |
| `.github/workflows/` | CI + production validation |
| `proxy.ts` | Clerk middleware |
| `package.json` / lockfile | Dependencies + scripts |
| `vercel.json` | Cron |
| `LICENSE` | Proprietary draft |
| `README.md` | Project readme |

---

## App sketch

```text
app/
  layout.tsx, page.tsx
  pricing|how-it-works|contact|commerce-intelligence|legal/
  (app)/{dashboard,saved,billing,alerts,analytics}/
  api/{search,intelligence,stripe,billing,copilot,ai-chat,health,cron,analytics,outbound,feedback}/
```

---

## Identity

- **npm name:** `smartbuy`  
- **version:** `0.1.0`  
- **private:** `true`  
- **Brand:** QuantAI  

---

## Hygiene note

`docs/architecture-audit/` holds deep historical audits; treat as diligence archive, not runtime. Do not confuse audit tooling folders with production dependencies.

Sale-candidate tag `quantai-sale-candidate-v1` is referenced in docs as a freeze baseline — verify on the remote during diligence.
