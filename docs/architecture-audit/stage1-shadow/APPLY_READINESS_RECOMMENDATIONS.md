# Future APPLY Readiness Recommendations — Stage 1 Observation

**Status:** Observation preparation only — **do not enable `QUANTAI_NORMALIZATION_APPLY=true`** until gates below pass.

**Code state:** Variant boundary improvements are implemented locally; production Vercel still serves prior build until you deploy.

---

## Current observation posture

| Control | Production today | After next deploy (same env) |
|---------|------------------|------------------------------|
| `MODE=shadow` | ✓ | ✓ |
| `APPLY=false` | ✓ | ✓ |
| `rankingMutation` | false | false |
| Tray invariant | ✓ | ✓ |
| False collapse (focus queries, offline) | 6 aggregate (old metric) | **0** (boundary-aware) |

---

## Readiness gates (unchanged)

Do **not** open APPLY review until all are true:

1. **14 days** of shadow telemetry with Stage 1 env
2. **7 consecutive days** aggregate readiness ≥ 85
3. **`falseCollapseIncidents === 0`** on golden fixtures + 8 live golden probes
4. Normalization **p95 < 5ms** (or documented waiver with search % budget)
5. Search **p95 regression < 5%** vs pre-shadow baseline
6. **Projected ranking lift > 0** on ≥ 70% of multi-retailer queries (top-3 dup reduction)

---

## Recommendations by priority

### P0 — Deploy boundary code (no env change)

- Ship `variantBoundary.ts` + `equivalenceGraph` + `shadowMetrics` updates
- Keep all four Stage 1 env vars unchanged
- Re-run `npm run test:stage1-shadow-probe` after deploy; expect `falseCollapseIncidents` drop on iphone/nike/airpods

### P1 — Continue shadow observation (14 days)

- Daily: `SEARCH_BASE_URL=... npm run test:stage1-shadow-probe`
- Weekly: `npm run stage1-variant-boundary-probe` on focus categories
- Monitor Vercel logs: `quantai.normalization.shadow` with `falseCollapseIncidents: 0`

### P2 — Fingerprint enrichment (pre-APPLY, Phase 0 only)

| Gap | Action |
|-----|--------|
| Missing storage in titles | Promote `storageGb` into `extractVariantFingerprint` when tier known |
| AirPods “Pro 3” noise | Extend `extractModelTierKey` for gen 3 vs pro 2 |
| Nike size normalization | Normalize `US 10` / `EU 44` to single `sizeKey` scale |
| Condition | Treat `renewed` / `refurbished` as hard boundary when both sides explicit |

### P3 — Metric calibration

- Old metric: any multi-`variantKey` group → incident
- New metric: axis conflict only → aligns with real collapse risk
- Document dashboard / readiness score uses new semantics post-deploy

### P4 — APPLY canary (only after P0–P3 gates)

Suggested sequence (not authorized now):

1. Staging: `MODE=dedup`, `APPLY=true`, 1% canary queries
2. Verify actual `outputCount < inputCount` only on duplicate-heavy trays
3. Measure **real** top-3 duplicate lift vs projected shadow lift
4. Rollback: `QUANTAI_NORMALIZATION_ENABLED=false` or `APPLY=false`

---

## Focus category sign-off (offline, post-boundary)

| Query | Boundary violations | Safe multi-member groups | APPLY blockers |
|-------|--------------------:|-------------------------|----------------|
| iphone 15 pro max | 0 | Cross-retailer Pro Max 256GB white | None identified |
| nike air force 1 white | 0 | White AF1 duplicate merchants | Size axis sparse — enrich before footwear APPLY |
| airpods pro 2 | 0 | Pro 2 duplicate merchants | Pro vs Pro 3 title noise — monitor |

---

## Next recommended action

1. **Deploy** normalization boundary code to Vercel (normal release — no APPLY, no env edits).
2. **Day 0 post-deploy:** run `test:stage1-shadow-probe` + `stage1-variant-boundary-probe`.
3. **Days 1–14:** daily probe + log check; record readiness trend.
4. **Day 14:** if gates pass, schedule APPLY review workshop — not APPLY enablement.

---

## Explicit non-actions

- Do **not** set `QUANTAI_NORMALIZATION_APPLY=true`
- Do **not** enable Phase 7 systems
- Do **not** change UI or ranking layers
- Do **not** skip shadow window for projected lift alone
