# Real Traffic Normalization Analytics

**Generated:** 2026-05-23T01:35:16.918Z

## Tracked dimensions (Stage 1)

| Dimension | Meta field | Log field |
|-----------|------------|-----------|
| Top-3 duplicate before/after | `top3DuplicateRateBefore/After` | ✓ |
| Projected lift (APPLY simulation) | `projectedRankingLift` | ✓ |
| Equivalence groups | `equivalenceGroupCount` | ✓ |
| Canonical ID coverage | `canonicalIdentityCoverage` | ✓ |
| Merchant diversity | `merchantDiversityScoreBefore/After`, `merchantDiversityDelta` | ✓ |
| Semantic rerank coherence | `semanticCoherenceScore` | ✓ |
| False collapse incidents | `falseCollapseIncidents` | ✓ |
| Normalization latency | `latencyMs`, `latencyPctOfSearch` | ✓ |
| Rollout readiness | `rolloutReadinessScore`, `rolloutReadinessGrade` | ✓ |

## Offline benchmark baseline

| Metric | Value |
|--------|------:|
| Offline cases passed | 2/2 |
| Avg shadow latency | 20.61ms |
| Avg apply latency | 7.53ms |

## Observation protocol (14 days)

1. Run `npm run test:stage1-shadow-probe` daily against production
2. Regenerate dashboard: `npm run stage1-shadow-dashboard`
3. Regenerate reports: `npm run stage1-shadow-report`
4. Monitor log drain for `quantai.normalization.shadow` p95/p99
5. Confirm `outputCount === inputCount` on 100% of shadow requests

---
*No embeddings · no retrieval · no ranking mutation in Stage 1.*
