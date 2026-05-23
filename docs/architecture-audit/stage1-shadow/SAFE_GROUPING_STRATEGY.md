# Safe Grouping Strategy — Stage 1 Shadow (Phase 0)

**Purpose:** Define when listings may share an `equivalenceClassId` without risking variant collapse at APPLY time.

**Constraints:** Shadow/meta_only only in production today. No ranking mutation until explicit APPLY review.

---

## Grouping tiers (strictest → loosest)

### Tier A — Always safe to cluster

| Rule | Example |
|------|---------|
| Identical `commerceId` | Same variant spine + anchors |
| Identical `variantKey` + cross-retail confidence ≥ 0.72 | Same 256GB white Pro Max on Amazon + Best Buy |
| Shared GTIN/UPC/ASIN **and** no variant boundary conflict | Same SKU across merchants |

### Tier B — Safe when boundary axes agree

Cluster only if `variantBoundaryConflict()` returns **no conflict**:

| Axis | Both sides required | Block when |
|------|-------------------|------------|
| Storage | `storageGb` present | 128 ≠ 256 |
| Color | `colorKey` present | white ≠ black |
| Size | `sizeKey` present | US 10 ≠ 11 |
| Model tier | `modelTierKey` present | pro ≠ pro_max, pro_2 ≠ pro |
| Condition | both not `unknown` | new ≠ refurbished/used |

**Missing axis on one listing does not block** — avoids over-splitting sparse retailer titles.

### Tier C — Never cluster in shadow (hard block)

- Conflicting Tier B axes (enforced in `equivalenceGraph.shouldCluster`)
- Different `model_tier` for phones/audio even if title similarity > 0.78
- Price ratio > 4.2× **and** weak title match (existing `identityMatchScore` guard)

### Tier D — Deferred to APPLY review only

- Collapse mode (`mode=collapse`) — not enabled in Stage 1
- Variant-level representative selection across **different** variant keys
- Semantic rerank dedup by `rankingIdentityKey` — gated on `flags.apply`

---

## Implementation map

| Component | Role |
|-----------|------|
| `variantBoundary.ts` | Extract axes; `variantBoundaryConflict()` |
| `equivalenceGraph.ts` | Boundary check **before** identifier / fuzzy merge |
| `shadowMetrics.ts` | `detectFalseCollapseIncidents` uses boundary violations only |
| `variantCollapse.ts` | Collapse **within** same `variantKey` only |
| `semanticReranker.ts` | Dedup suppression only when `apply=true` |

---

## Category-specific policy

### Phones (iPhone)

- **Must split:** storage, pro/max/plus/mini tier, condition (new vs renewed)
- **May cluster:** same tier + same storage + same color across merchants
- **Fingerprint gap:** listings without GB in title rely on `modelTierKey` only

### Footwear (Nike AF1)

- **Must split:** color, size (when both explicit)
- **May cluster:** same color + same size across merchants
- **Watch:** `af1` vs `af1_white` groups — separate until color present on both sides

### Audio (AirPods)

- **Must split:** pro vs pro 2 vs max vs gen 2/3
- **Must not bypass boundary** via weak shared identifiers
- **May cluster:** same tier duplicates (marketplace noise titles)

---

## Shadow vs APPLY behavior

| Stage | Tray size | Equivalence clustering | Ranking order |
|-------|-----------|------------------------|---------------|
| Stage 1 shadow | `inputCount === outputCount` | Tier A + B only | Unchanged |
| APPLY dedup (future) | May shrink | Tier A + B; representatives only | Dedup by `rankingIdentityKey` |

---

## Validation commands

```bash
npm run test:normalization
npm run test:normalization-ranking
SEARCH_BASE_URL=https://quant-ai-app.vercel.app npm run stage1-variant-boundary-probe
SEARCH_BASE_URL=https://quant-ai-app.vercel.app npm run test:stage1-shadow-probe
```

**Gate before APPLY:** `falseCollapseIncidents === 0` on golden + live probes for 7 consecutive days.
