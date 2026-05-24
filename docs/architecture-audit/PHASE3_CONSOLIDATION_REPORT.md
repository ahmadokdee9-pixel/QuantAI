# Phase 3 — Governance Kernel Consolidation Report

**Generated:** 2026-05-24  
**Status:** Complete (code + CI; no production deploy)  
**Discipline:** APPLY=false · no ranking mutation · shadow-safe only

---

## Executive summary

Phase 3 consolidates QuantAI’s fragmented P5.0–P6.9 controlled stack into a **single orchestration kernel**, introduces **bounded layer contracts**, **explicit normalization execution graph**, **global production mutation hard-block**, and **production observability** (per-layer timings, orchestration graph, replay traces). The search route no longer contains ~375 lines of sequential `applyControlled*` calls.

**Verdict:** Safe to deploy for **observability + consolidation** only. **NOT** ready for normalization APPLY canary until Phase 2 gates pass (see blockers below).

---

## Changed files

### New — governance kernel (`lib/governance/`)

| File | Purpose |
|------|---------|
| `unifiedControlledStackKernel.ts` | Authoritative P5.0→P6.9 orchestration; replay traces; mutation invariant |
| `deterministicLayerRouter.ts` | Canonical 20-layer DAG, dependencies, meta keys |
| `controlledStackLayerRunners.ts` | Single dispatch table for all `applyControlled*` |
| `controlledStackTypes.ts` | Shared accum / intent bootstrap types |
| `layerExecutionContract.ts` | Per-layer cost, latency budget, replay/mutation contracts |
| `applyMutationGuard.ts` | Production hard-block + kernel rollback |
| `index.ts` | Public governance exports |

### New — normalization graph

| File | Purpose |
|------|---------|
| `lib/intelligence/normalization/normalizationExecutionGraph.ts` | Explicit `post_semantic` / `post_controlled` nodes |

### Modified

| File | Change |
|------|--------|
| `app/api/search/route.ts` | Kernel + `executeNormalizationStage`; removed 20 scattered imports |
| `lib/governance/controlledStackRegistry.ts` | `isControlledLayerEnabled()` |
| `lib/governance/replayKernel.ts` | `buildReplayTrace`, re-export drift helpers |
| `lib/intelligence/normalization/finalizeSearchNormalization.ts` | Delegates to graph terminus |
| `lib/intelligence/normalization/index.ts` | Graph exports |
| `scripts/intent-prod-ci-guard.mjs` | Phase 3 kernel wiring checks |
| `scripts/search-meta-lifecycle-guard.mjs` | Phase 3 guards |
| `package.json` | `test`, `test:phase3-governance`, orchestration/replay scripts |

### New — CI / tests

| Script | npm script |
|--------|------------|
| `scripts/orchestration-consistency-guard.mjs` | `test:orchestration-consistency` |
| `scripts/layer-contract-validation.mjs` | `test:layer-contracts` |
| `scripts/test-orchestration-kernel.mjs` | `test:orchestration-kernel` |
| `scripts/test-replay-determinism.mjs` | `test:replay-determinism` |

---

## Removed duplication

| Before | After |
|--------|-------|
| 20 sequential `applyControlled*` blocks in `route.ts` (~375 lines) | One `runUnifiedControlledStack()` call |
| 20 duplicate enable scans (registry + per-layer) | Registry + router; kernel records skip telemetry |
| Implicit normalization two-stage flow | `normalizationExecutionGraph.ts` with node contracts |
| Scattered replay/drift helpers per layer | `replayKernel.ts` + kernel-level `buildReplayTrace` |
| Route-only orchestration knowledge | `controlledStackLayerRunners.ts` shared with CI/runner path (runner migration optional follow-up) |

**Not migrated in Phase 3 (intentional):** per-layer `countTopDrift` clones inside each `*Intelligence.ts` — layers retain internal rollback; kernel adds **production hard-block** overlay.

---

## Latency impact

| Area | Expected impact |
|------|-----------------|
| Production (all layers OFF) | **Neutral** — layers still short-circuit internally; `fastPathEligible` telemetry unchanged |
| Production (layers ON) | **+0–2ms** orchestration overhead (graph + traces); within per-layer budgets (8–24ms soft caps) |
| Normalization graph | **Neutral** — same `integrateNormalizationInSearchTray` underneath |
| Search meta payload | **+small** when not on meta lite — `controlledStack.orchestration` object (dev/observability) |

**Interim latency gate:** normalization p95 ≤ 250ms (Phase 2); controlled stack budgets 8–24ms/layer in contracts (telemetry only).

---

## Governance simplification

1. **Single entry:** `runUnifiedControlledStack({ products, intent, registry })`
2. **Deterministic order:** `CONTROLLED_LAYER_ROUTES` P5.0 → P6.9
3. **Contracts:** `CONTROLLED_LAYER_CONTRACTS` — `applyCapable: false` globally until canary sign-off
4. **Mutation policy:** `resolveGlobalMutationPolicy()` — production blocks ranking mutation unless `QUANTAI_GOVERNANCE_PRODUCTION_MUTATION_ALLOW=true` (default **false**)
5. **Normalization APPLY:** `assertNormalizationApplyBlocked()` + existing `QUANTAI_NORMALIZATION_APPLY_PRODUCTION_CONFIRMED` double-confirm

---

## Replay guarantees

- **Twin-run determinism:** `replayKernel` link comparison + integrity floor (70) + drift limit (3)
- **Per-layer traces:** `orchestration.replayTraces[]` on every search (when orchestration meta included)
- **Kernel rollback:** `enforceControlledLayerRankingInvariant` restores baseline tray on production drift
- **CI:** `test:replay-determinism` validates drift counter + rollback verdict logic

---

## Production observability (new meta)

```json
{
  "controlledStack": {
    "version": "phase3",
    "fastPath": true,
    "rankingMutation": false,
    "orchestration": {
      "layers": [{ "layerId", "enabled", "skipped", "latencyMs", "drift", "rolledBack" }],
      "replayTraces": [{ "layerId", "preLinks", "postLinks", "drift" }]
    }
  },
  "normalizationGraph": { "version": "phase3", "nodes": [...] }
}
```

Log events unchanged: `quantai.normalization.shadow`, `quantai.normalization.shadow.audit`.

---

## Rollback strategy

| Risk | Rollback |
|------|----------|
| Kernel regression | Revert `route.ts` to call `applyControlled*` directly (runners file retained) |
| Orchestration meta size | `QUANTAI_SEARCH_META_LITE=true` strips layer blobs (Phase 1) |
| Mutation false positive | Set `QUANTAI_GOVERNANCE_PRODUCTION_MUTATION_ALLOW=true` **staging only** (emergency) |
| Normalization graph | `finalizeSearchNormalization` still exported; revert graph import only |

**No data migration.** Env-only rollback.

---

## Production risk assessment

| Risk | Level | Mitigation |
|------|-------|------------|
| Ranking mutation | **Low** | Hard-block + kernel invariant + APPLY=false |
| UI / cards | **None** | No UI files touched |
| Latency regression | **Low** | Budgets + lite meta |
| Meta payload growth | **Medium** | Lite meta in production |
| Partial layer enable | **Low** | Runners preserve upstream meta chain |

---

## Remaining blockers before APPLY canary

1. **Phase 2 live gates:** `falseCollapseIncidents = 0` for 14 days (current prod probe: **1** on airpods — deploy variant-boundary + Phase 1/2)
2. **Deploy this branch** — kernel/graph not on production until Vercel deploy
3. **Semantic coherence meta** on prod build (Phase 2 field)
4. **Staging canary only:** `QUANTAI_NORMALIZATION_APPLY_CANARY` + `CANARY_CONFIRMED` — never prod without `APPLY_PRODUCTION_CONFIRMED`
5. **Optional follow-up:** migrate `scripts/lib/intentEvaluationRunner.mjs` to `runUnifiedControlledStack` for CI parity

---

## Validation (executed)

```bash
npm run build                    # PASS
npm run test                     # PASS (phase3 + normalization + meta lifecycle)
npm run test:orchestration-kernel
npm run test:replay-determinism
npm run test:intent-prod-ci-guard  # PASS
```

---

## Constraints preserved

- No UI / scan-first UX changes  
- No embeddings / RAG / vector retrieval  
- No `QUANTAI_NORMALIZATION_APPLY=true` in production  
- No ranking mutation in production (hard-block)  
- Deterministic layer order and replay discipline  

---

*Phase 3 prepares infrastructure for Phase E full governor framework RFC; it does not enable cognition layers or APPLY.*
