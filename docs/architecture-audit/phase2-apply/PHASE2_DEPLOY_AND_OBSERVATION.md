# Phase 2 — Deploy Phase 1 + Enable Shadow Observation

**APPLY=false remains mandatory until readiness verdict passes.**

## Step 1 — Deploy Phase 1 stabilization

1. Merge Phase 1 + Phase 2 prep code to `main`
2. Deploy via Vercel (normal flow) — **no UI changes**
3. Confirm `npm run build` green in CI

## Step 2 — Vercel Production env (exact)

```
QUANTAI_NORMALIZATION_ENABLED=true
QUANTAI_NORMALIZATION_MODE=shadow
QUANTAI_NORMALIZATION_APPLY=false
QUANTAI_NORMALIZATION_SHADOW_TELEMETRY=true
QUANTAI_SEARCH_META_LITE=true
```

**Never set in production yet:**

```
QUANTAI_NORMALIZATION_APPLY=true
QUANTAI_NORMALIZATION_APPLY_PRODUCTION_CONFIRMED=true
```

## Step 3 — Post-deploy verification

```bash
npm run test:search-meta-lifecycle
SEARCH_BASE_URL=https://YOUR_DOMAIN npm run test:stage1-shadow-probe
SEARCH_BASE_URL=https://YOUR_DOMAIN npm run normalization-duplicate-monitor
SEARCH_BASE_URL=https://YOUR_DOMAIN npm run phase2-apply-readiness
```

## Step 4 — Log monitoring (Vercel / analytics)

Watch for:

| Event | Purpose |
|-------|---------|
| `quantai.normalization.shadow` | Core shadow metrics |
| `quantai.normalization.shadow.audit` | Duplicate collapse + diversity audit |

Alert on: `falseCollapseAlert=true`, `apply=true`, `trayInvariant=false`

## Step 5 — 14-day observation

Run daily:

```bash
SEARCH_BASE_URL=https://YOUR_DOMAIN npm run normalization-duplicate-monitor
```

## Step 6 — APPLY canary (staging only, after READY_FOR_CANARY)

```
QUANTAI_NORMALIZATION_MODE=dedup
QUANTAI_NORMALIZATION_APPLY=true
QUANTAI_NORMALIZATION_APPLY_CANARY=true
QUANTAI_NORMALIZATION_CANARY_CONFIRMED=true
```

Staging only. Production APPLY requires separate sign-off + `QUANTAI_NORMALIZATION_APPLY_PRODUCTION_CONFIRMED=true`.
