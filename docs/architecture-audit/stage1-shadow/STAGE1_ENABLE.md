# Stage 1 Production Shadow Rollout — Enable Guide

**Objective:** Normalization telemetry on live traffic with **zero ranking mutation**.

## Required environment variables (Vercel / production)

```bash
QUANTAI_NORMALIZATION_ENABLED=true
QUANTAI_NORMALIZATION_MODE=shadow
QUANTAI_NORMALIZATION_APPLY=false
QUANTAI_NORMALIZATION_SHADOW_TELEMETRY=true
```

Optional (recommended for dashboards):

```bash
QUANTAI_ANALYTICS_SINK_URL=https://your-analytics-ingest/hook
```

## Local development

Add the same block to `.env.local` (use `npm run env:pull` only via safe merge — never bare `vercel env pull`).

Restart dev server after changing env.

## Verification

```bash
# Unit + offline golden
npm run test:normalization
npm run test:normalization-ranking

# Live probe (requires running server with Stage 1 env)
SEARCH_BASE_URL=http://localhost:3000 npm run test:stage1-shadow-probe

# Dashboard + reports
npm run stage1-shadow-dashboard
npm run stage1-shadow-report
```

## Success criteria (Stage 1)

- [ ] `meta.normalizationStage1.rollout === "stage1_shadow"`
- [ ] `meta.normalizationProduction.apply === false`
- [ ] `inputCount === outputCount` on all shadow responses
- [ ] Production logs emit `quantai.normalization.shadow`
- [ ] 14-day observation before APPLY review

## Rollback

```bash
QUANTAI_NORMALIZATION_ENABLED=false
```

Instant — no ranking mutation to revert.

## Outputs

| Artifact | Path |
|----------|------|
| Dashboard | `docs/architecture-audit/stage1-shadow/dashboard/index.html` |
| Telemetry report | `docs/architecture-audit/stage1-shadow/PRODUCTION_SHADOW_TELEMETRY_REPORT.md` |
| Analytics spec | `docs/architecture-audit/stage1-shadow/REAL_TRAFFIC_NORMALIZATION_ANALYTICS.md` |
| Readiness score | `docs/architecture-audit/stage1-shadow/ROLLOUT_READINESS_SCORE.md` |
| APPLY checklist | `docs/architecture-audit/stage1-shadow/APPLY_TRUE_SAFETY_CHECKLIST.md` |
| Evidence report | `docs/architecture-audit/stage1-shadow/RANKING_SUPERIORITY_EVIDENCE_REPORT.md` |
| Live samples | `docs/architecture-audit/stage1-shadow/samples/*.json` |
