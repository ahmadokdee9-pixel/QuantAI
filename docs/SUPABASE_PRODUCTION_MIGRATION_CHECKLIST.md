# Supabase production migration checklist

## Migration files (repo)

Apply in order under `supabase/migrations/`:

| File | Focus |
|------|--------|
| `20250510120000_intelligence_foundation.sql` | search_history, watchlist, memory |
| `20250510140000_saved_products_compare_prefs.sql` | saved_products, compare |
| `20260110120000_search_history_user_memory_rls.sql` | RLS policies |
| `20260518190000_launch_retention_billing_attribution.sql` | outbound_clicks, billing |

## Pre-launch steps

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → **Production** project (not dev if split).
2. **SQL Editor** → run each migration file in timestamp order, or use Supabase CLI:
   ```bash
   supabase db push
   ```
3. Confirm tables exist:
   - `saved_products`
   - `search_history`
   - `user_shopping_memory`
   - `shopping_watchlist`
   - `outbound_clicks` (if using outbound tracking)
4. Set Vercel Production:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY` (server only — never `NEXT_PUBLIC_`)
5. Optional: `NEXT_PUBLIC_SUPABASE_ANON_KEY` for future client reads

## Automated verify

```bash
# File presence + optional live REST probe
NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run test:beta-supabase-migrations
```

## Manual smoke (signed-in)

1. Sign in on Production.
2. Run a search → save a product.
3. Open `/saved` — item appears.
4. Delete item — no 500.

## Rollback

Migrations are additive. Do not drop tables in Production without backup. Prefer feature flags over schema rollback.
