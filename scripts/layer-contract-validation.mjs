#!/usr/bin/env node
/**
 * Phase 3 CI — validate bounded execution contracts for all controlled layers.
 */
import {
  CONTROLLED_LAYER_CONTRACTS,
  validateLayerContract,
} from "../lib/governance/layerExecutionContract.ts";
import { CONTROLLED_LAYER_ROUTES } from "../lib/governance/deterministicLayerRouter.ts";
import { NORMALIZATION_GRAPH_NODES } from "../lib/intelligence/normalization/normalizationExecutionGraph.ts";

let failed = 0;
for (const [id, contract] of Object.entries(CONTROLLED_LAYER_CONTRACTS)) {
  const errors = validateLayerContract(contract);
  if (errors.length) {
    console.log(`FAIL ${id}: ${errors.join(", ")}`);
    failed += 1;
  } else {
    console.log(`PASS ${id}`);
  }
}

if (CONTROLLED_LAYER_ROUTES.length !== 20) {
  console.log(`FAIL router layer count ${CONTROLLED_LAYER_ROUTES.length} !== 20`);
  failed += 1;
}

for (const node of Object.values(NORMALIZATION_GRAPH_NODES)) {
  if (!node.replaySafe || node.applyCapable) {
    console.log(`FAIL normalization node ${node.stage} must be replaySafe and applyCapable false in phase3`);
    failed += 1;
  } else {
    console.log(`PASS normalization:${node.stage}`);
  }
}

process.exit(failed ? 1 : 0);
