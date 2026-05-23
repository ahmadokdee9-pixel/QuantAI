# Rollout Readiness Score

**Generated:** 2026-05-23T01:35:16.918Z  
**Current aggregate score:** 0/100  
**Grade:** NOT_READY

## Scoring rubric (per request, aggregated)

| Criterion | Points |
|-----------|-------:|
| Stage 1 config (shadow, apply=false) | 15 |
| Canonical identity coverage ≥85% | 15 |
| Equivalence groups detected | 10 |
| Duplicate density measurable (top3 dup ≥15%) | 10 |
| Projected ranking lift ≥0.2 | 15 |
| Zero false collapse incidents | 20 |
| Semantic coherence ≥80% | 10 |
| Normalization latency ≤5ms | 5 |
| Norm latency ≤5% of search | 5 |
| Merchant diversity non-negative delta | 5 |

## Gate for APPLY=true review

- [ ] 14-day shadow observation complete
- [ ] Aggregate readiness ≥85 for 7 consecutive days
- [ ] False collapse incidents = 0 across golden set
- [ ] Normalization p95 < 5ms
- [ ] Search p95 regression < 5%
- [ ] Projected ranking lift > 0 on ≥70% of multi-retailer queries

**Current status:** Enable Stage 1 env and run live probe
