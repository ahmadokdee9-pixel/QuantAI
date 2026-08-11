# H-03 Verification Report

**Date:** 2026-08-11  
**Scope:** H-03 only (monetization / plan entitlement source of truth)  
**Result:** **PASS**  
**Rollback used:** No  
**Rollback tag:** `rollback-h03-*` @ pre-fix HEAD  
**Commit:** `29acd44`  
**Deployment:** https://www.quantaihq.com  
**Other Highs:** Untouched (none remain)  

---

## Root cause

1. **`resolveServerSubscriptionTier` failed open to Clerk `publicMetadata`** when billing was missing, errored, or not `active`/`trialing`. Canceled / unpaid / expired rows could still inherit stale Premium from Clerk.
2. **Checkout / portal soft-succeeded** with `mode: "placeholder"` when Stripe was unset — not fail-closed.
3. **Production `STRIPE_SECRET_KEY` unset** (`services.stripe === false`) — confirmed 10/10; entitlements must not pretend paid access without billing SoT.

---

## Fix

| Change | Purpose |
|--------|---------|
| `tierFromBillingState` + fail-closed `resolveServerSubscriptionTier` | SoT = `user_billing_state`; unsynced ≠ Premium; canceled/unpaid/past_due → free |
| Checkout / portal → **503** when Stripe/customer missing | Billing failures fail closed |
| Webhook paidOk only for active/trialing | Sync stored tier to free on failed/canceled states |
| Health `monetization` block + Stripe warning | Honest production readiness signal |

---

## Files changed

| File | Change |
|------|--------|
| `lib/subscription/resolveTier.ts` | Billing SoT, fail-closed |
| `app/api/stripe/checkout/route.ts` | 503 when Stripe unset |
| `app/api/stripe/portal/route.ts` | 503 when unavailable |
| `app/api/stripe/webhook/route.ts` | Non-paid statuses → free tier |
| `app/api/billing/subscription/route.ts` | Single resolve path |
| `app/api/health/route.ts` | Monetization SoT + warning |
| `lib/stripe/config.ts` | Comment: SoT is billing state |
| `scripts/test-h03-entitlement-sot.mjs` | Regression matrix |
| `scripts/qa-independent-h03.mjs` | Independent QA |

---

## Tests / gates

- `npx tsx scripts/test-h03-entitlement-sot.mjs` — **PASS**
- ESLint · `tsc` · `npm run build` — **PASS**
- Deploy `29acd44` — **READY**

---

## Production evidence

| Probe | Result |
|-------|--------|
| `/api/health` monetization | `entitlementSoT=user_billing_state`, `clerkMetadataGrantsPremium=false` |
| Stripe service | `false` + warning (env still unset — expected; checkout fail-closed) |
| Guest billing / checkout / portal | **401** |
| Webhook without signature | **503** |
| Search MacBook Pro 14 | **29** products |
| Decision hostile | **400** |
| Rate limit | Upstash shared |

---

## Independent QA

- `docs/wave1/H03_INDEPENDENT_QA.json` — **PASS**
- Entitlement matrix: guest/free/active/canceled/unpaid/past_due/expired/invalid

---

## Launch Board

| Item | Action |
|------|--------|
| H-03 | **Removed** |
| Critical | **0** |
| High | **0** |
| Wave 2 | **CLOSED** |
| Core development | **FROZEN** (no new core features without production evidence) |
| Residual | Set `STRIPE_*` in Vercel for live checkout (ops); PB residual register remains for Public Beta |
