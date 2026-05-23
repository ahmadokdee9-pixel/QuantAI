# APPLY=true Safety Checklist

**Do not enable until all items checked.**

## Pre-conditions (Stage 1 complete)

- [ ] 14 days shadow telemetry collected
- [ ] `npm run test:stage1-shadow-probe` green against production
- [ ] `npm run test:normalization-ranking` offline 100% pass
- [ ] Dashboard shows projected lift > 0 on majority of golden queries
- [ ] Rollout readiness score ≥85 (7-day rolling avg)
- [ ] False collapse incidents = 0 on golden + live set
- [ ] Normalization p95 < 5ms; p99 < 10ms
- [ ] Search p95 regression < 5% vs pre-Stage-1 baseline

## APPLY rollout steps

1. Set `QUANTAI_NORMALIZATION_MODE=dedup` (not collapse initially)
2. Set `QUANTAI_NORMALIZATION_APPLY=true` on **canary deploy only**
3. Monitor top-3 duplicate rate ↓ ≥25%
4. Monitor tray size reduction vs duplicateListingCount
5. Emergency rollback: `QUANTAI_NORMALIZATION_APPLY=false` (< 60s)

## Forbidden in first APPLY wave

- [ ] Do NOT enable collapse mode yet
- [ ] Do NOT enable all layers P5–P6.9
- [ ] Do NOT add embeddings/retrieval
- [ ] Do NOT bypass semantic rerank dedup

## Sign-off required

- [ ] Search platform lead
- [ ] SRE on-call
- [ ] Architecture (QuantAI CIOS)
