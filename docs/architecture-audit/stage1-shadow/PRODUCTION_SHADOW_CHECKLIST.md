# Production Shadow Deployment Checklist

**Readiness score:** 100/100  
**Pre-deploy validation:** PASSED

## Pre-deploy (complete before Vercel)

- [x] env flags parse Stage 1 config
- [x] APPLY=true ignored when MODE=shadow (production safety)
- [x] outputCount === inputCount in shadow mode
- [x] integrateNormalizationInSearchTray preserves tray size
- [x] normalizationMetaForSearchResponse exports required meta keys
- [x] normalization layer has no embedding/retrieval imports
- [x] npm run test:normalization
- [x] npm run test:normalization-ranking
- [x] npm run build

## Vercel env (Production) — exact values

```
QUANTAI_NORMALIZATION_ENABLED=true
QUANTAI_NORMALIZATION_MODE=shadow
QUANTAI_NORMALIZATION_APPLY=false
QUANTAI_NORMALIZATION_SHADOW_TELEMETRY=true
```

## Post-deploy verification

- [ ] Search API returns `meta.normalizationStage1.rankingMutation === false`
- [ ] `meta.normalizationProduction.apply === false`
- [ ] `qiNormalizationMeta.inputCount === qiNormalizationMeta.outputCount`
- [ ] Logs show `quantai.normalization.shadow`
- [ ] `npm run test:stage1-shadow-probe` against production URL

## Rollback

```
QUANTAI_NORMALIZATION_ENABLED=false
```

Redeploy. Zero ranking impact — telemetry only.
