# H-05 Verification Report

**Date:** 2026-08-11  
**Scope:** H-05 only (Content-Security-Policy on production HTML)  
**Result:** **PASS**  
**Rollback used:** No  
**Rollback tag:** `rollback-h05-20260811-011752` @ `02eaada`  
**Commit:** `3b81248`  
**Deployment:** https://www.quantaihq.com  
**H-04 / H-07 / H-03:** Untouched  

---

## Root cause

No application path emitted a `Content-Security-Policy` header. `next.config.ts` was empty and `proxy.ts` (Clerk middleware) did not enable `contentSecurityPolicy`, so production HTML only carried HSTS.

---

## CSP policy implemented

Clerk middleware **strict** CSP (`nonce` + `strict-dynamic`) plus QuantAI custom directives:

| Directive | Policy notes |
|-----------|----------------|
| `default-src` | `'self'` (Clerk default) |
| `script-src` | `'self'` + nonce + `strict-dynamic` + Stripe/Clerk protect/Cloudflare; **no `unsafe-eval` in production** |
| `style-src` | `'self' 'unsafe-inline'` — **justified**: Clerk CSS-in-JS requirement |
| `img-src` | `'self' data: blob: https:` — retailer product images |
| `font-src` | `'self' data:` |
| `connect-src` | `'self'` + Clerk FAPI/telemetry/protect + Stripe API |
| `frame-src` | `'self'` + Stripe + Cloudflare challenges + Clerk protect |
| `object-src` | `'none'` |
| `base-uri` | `'self'` |
| `frame-ancestors` | `'none'` |
| `worker-src` | `'self' blob:` (Clerk default) |
| `form-action` | `'self'` (Clerk default) |

Complementary headers (`next.config.ts`): `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, `Cross-Origin-Opener-Policy: same-origin-allow-popups`.

---

## Files changed

| File | Change |
|------|--------|
| `proxy.ts` | Enable Clerk `contentSecurityPolicy: { strict: true, directives }` |
| `lib/security/cspDirectives.ts` | QuantAI CSP directive extensions |
| `next.config.ts` | Complementary security headers (no duplicate CSP) |
| `scripts/test-h05-csp.mjs` | Regression |
| `scripts/qa-independent-h05.mjs` | Independent QA |

---

## Tests / gates

- `npx tsx scripts/test-h05-csp.mjs` — **PASS**
- ESLint · `tsc` · `npm run build` — **PASS**

---

## Production evidence

Uncached `GET /` / `/pricing` / `/api/health`: **CSP present**.  
Search MacBook Pro 14: **22 products**. Decision hostile: **400**. Clerk middleware: `x-clerk-auth-status=signed-out`.

---

## Independent QA

- `docs/wave1/H05_INDEPENDENT_QA.json` — **PASS**
- Note: `/sign-in` remains 404 (tracked as **H-04**, not introduced by H-05)

---

## Launch Board

| Item | Action |
|------|--------|
| H-05 | **Removed** |
| Remaining High | **3** |
| Next (approval required) | **H-04** |
