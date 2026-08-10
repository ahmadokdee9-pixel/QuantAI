# H-04 Verification Report

**Date:** 2026-08-11  
**Scope:** H-04 only (guest auth funnel / protected-route 404s)  
**Result:** **PASS**  
**Rollback used:** No  
**Rollback tag:** `rollback-h04-20260811-013402` @ `07c7112`  
**Commit:** `e88739a`  
**Deployment:** https://www.quantaihq.com  
**H-07 / H-03:** Untouched  

---

## Root cause

Protected routes called `auth.protect()` with no Clerk sign-in/up pages and no `signInUrl`. For document navigations Clerk could not redirect to a real sign-in surface; for non-document requests it used `protect-rewrite` → dead app **404**. Guests hit 404 instead of the Clerk sign-in flow.

---

## Fix

| Change | Purpose |
|--------|---------|
| `app/sign-in/[[...sign-in]]/page.tsx` | Path-routed `<SignIn />` (preserves `redirect_url`) |
| `app/sign-up/[[...sign-up]]/page.tsx` | Path-routed `<SignUp />` |
| `proxy.ts` | `signInUrl` / `signUpUrl` + keep `auth.protect()` |
| `.env.example` | Document Clerk sign-in/up URL env vars |

Auth not weakened: middleware still protects the same matchers; non-document requests still get protect-rewrite 404.

---

## Files changed

| File | Change |
|------|--------|
| `app/sign-in/[[...sign-in]]/page.tsx` | New Clerk sign-in page |
| `app/sign-up/[[...sign-up]]/page.tsx` | New Clerk sign-up page |
| `proxy.ts` | `signInUrl` / `signUpUrl` |
| `.env.example` | Clerk URL docs |
| `scripts/test-h04-auth-funnel.mjs` | Wiring regression |
| `scripts/qa-independent-h04.mjs` | Independent QA (cookie jar + document Accept) |

---

## Tests / gates

- `npx tsx scripts/test-h04-auth-funnel.mjs` — **PASS**
- ESLint · `tsc --noEmit` · `npm run build` — **PASS**
- Deploy `e88739a` — **READY**

---

## Production evidence

Uncached document navigation (cookie jar + `Accept: text/html`):

| Path | Result |
|------|--------|
| `/sign-in` | **200** (after Clerk handshake) |
| `/dashboard` | → `/sign-in?redirect_url=…/dashboard` **200** |
| `/decisions` | → `/sign-in?redirect_url=…/decisions` **200** |
| `/watchlist`, `/saved`, `/agent`, `/billing`, `/feed` | same pattern |
| Non-document `GET /dashboard` (`Accept: */*`) | **404** protect-rewrite (auth intact) |

Controls: homepage **200** + CSP; search MacBook Pro 14 → **22** products; decision hostile → **400**; Upstash rate limit active.

---

## Independent QA

- `docs/wave1/H04_INDEPENDENT_QA.json` — **PASS**
- No redirect loops; no document-nav dead 404s; returnUrl preserved

---

## Launch Board

| Item | Action |
|------|--------|
| H-04 | **Removed** |
| PB-11 | **Removed** (DoD satisfied) |
| Remaining High | **2** |
| Next (approval required) | **H-07** |
