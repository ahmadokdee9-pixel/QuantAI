# H-07 Verification Report

**Date:** 2026-08-11  
**Scope:** H-07 only (critical-path payload weight / bounce risk)  
**Result:** **PASS**  
**Rollback used:** No  
**Rollback tag:** `rollback-h07-20260811-015833` @ `2f7ae8c`  
**Commit:** `377680a`  
**Deployment:** https://www.quantaihq.com  
**H-03:** Untouched  

---

## Root cause

Homepage critical path paid for unused font weight:

1. **Render-blocking Fontshare `@import`** in `globals.css` pulled Satoshi (4 weights) through a third-party CSS cascade before LCP text could settle on the already-loaded Geist stack.
2. **IBM Plex Sans Arabic (4 weights, ~139 KiB)** was always preloaded from the root layout despite `lang="en"`.
3. **Cockpit chrome** (`CommandPalette`, `FloatingIntelDock`) shipped eagerly on every page, including marketing first paint.

---

## Fix

| Change | Purpose |
|--------|---------|
| Remove Fontshare `@import`; `--font-qa-display` → Geist | Kill render-blocking third-party font cascade |
| Remove `IBM_Plex_Sans_Arabic` from `app/layout.tsx` | Drop ~139 KiB always-on Arabic fonts |
| Dynamic-import cockpit chrome in `QuantShell` | Defer framer-motion chrome off marketing path |

---

## Files changed

| File | Change |
|------|--------|
| `app/globals.css` | Remove Fontshare/Satoshi; drop Arabic font CSS var |
| `app/layout.tsx` | Remove Arabic `next/font` |
| `components/shell/QuantShell.tsx` | Dynamic `CommandPalette` + `FloatingIntelDock` |
| `scripts/test-h07-critical-path.mjs` | Wiring regression |
| `scripts/measure-critical-path.mjs` | Prod weight probe |
| `scripts/qa-independent-h07.mjs` | Independent QA |

---

## Before / after production metrics

| Metric | Before (fresh pre-fix) | After | Delta |
|--------|-------------------------|-------|-------|
| Font bytes (HTML-referenced) | 208,648 | 69,740 | **−138,908** |
| Non-Geist fonts | 138,908 | 0 | **−100%** |
| LCP | 3.9 s | 3.1 s | **−0.8 s** |
| Lighthouse total byte weight | 335 KiB | 197 KiB | **−138 KiB** |
| Prior confirmed H-07 LCP (Aug 5) | 9.9 s | 3.1 s | **−6.8 s** |

Evidence: `docs/wave1/H07_BEFORE_METRICS.json`, `docs/wave1/H07_AFTER_METRICS.json`, `docs/wave1/lighthouse-h07-after.json`

---

## Tests / gates

- `npx tsx scripts/test-h07-critical-path.mjs` — **PASS**
- ESLint · `tsc --noEmit` · `npm run build` — **PASS**
- Deploy `377680a` — **READY**

---

## Independent QA

- `docs/wave1/H07_INDEPENDENT_QA.json` — **PASS**
- Controls: homepage 200 + CSP; search 29 products; decision hostile 400; Upstash rate limit; Clerk protect intact

---

## Launch Board

| Item | Action |
|------|--------|
| H-07 | **Removed** |
| PB-09 | **Removed** (DoD satisfied) |
| Remaining High | **1** |
| Next (approval required) | **H-03** |
