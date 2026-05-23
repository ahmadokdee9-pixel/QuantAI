# Meta Lifecycle — Phase 1 Stabilization

## Authoritative product order

Final `data.products` order is established by:

1. Cached pipeline enrichment
2. Pre-stack ranking (persona, identity gate, semantic rerank, commerce quality, buying decision)
3. Controlled P5.0–P6.9 apply chain (OFF by default in production)
4. `rebuildSearchTrayArtifacts()` — **dealClusters + searchIntelligence**
5. `finalizeSearchNormalization()` — post_controlled shadow/APPLY prep
6. `rebuildSearchTrayArtifacts()` — final alignment

## Response meta

- `latencyBudget` — real per-stage `durationMs` from `PipelineTrace`
- `controlledStack` — enabled layer count + fast-path flag
- `trayMetaCoherence` — CI-style coherence check on cluster vs tray links
- `QUANTAI_SEARCH_META_LITE=true` (default in production) trims duplicate debug payloads

## CI

```bash
npm run test:search-meta-lifecycle
npm run test:intent-prod-ci-guard
```
