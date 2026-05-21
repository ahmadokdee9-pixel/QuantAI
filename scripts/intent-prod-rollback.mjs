/**
 * P4.3 — Production instant rollback verification.
 * Usage: npm run test:intent-prod-rollback
 */
import { semanticRerankSearchResults } from "../lib/search/semanticReranker.ts";
import { buildCanonicalQuery } from "../lib/search/canonicalQuery.ts";
import { buildIntentProductionApplyMeta } from "../lib/intent/intentProductionApply.ts";
import { buildIntentApplyMeta } from "../lib/intent/intentApply.ts";
import {
  isIntentIntelligenceApplyEnabled,
  resolveIntentRolloutMode,
} from "../lib/intent/intentIntelligenceFlags.ts";
import { saveValidationRun } from "./lib/validationHistory.mjs";

const saved = {
  NODE_ENV: process.env.NODE_ENV,
  INTENT_INTELLIGENCE_APPLY_ENABLED: process.env.INTENT_INTELLIGENCE_APPLY_ENABLED,
  INTENT_INTELLIGENCE_PROD_APPLY: process.env.INTENT_INTELLIGENCE_PROD_APPLY,
  INTENT_INTELLIGENCE_CANARY_APPLY: process.env.INTENT_INTELLIGENCE_CANARY_APPLY,
};

function restore() {
  for (const [k, v] of Object.entries(saved)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
}

const query = "authentic ysl libre trusted seller only";
const products = [
  { title: "YSL Libre EDP 90ml Authentic", store: "Douglas", price: 95, link: "d1", extensions: [], rating: 4.2 },
  { title: "Inspired by Libre Clone Oil", store: "Temu Deals", price: 12, link: "t1", extensions: [], rating: 4.2 },
  { title: "Yves Saint Laurent Libre 90ml", store: "Notino", price: 92, link: "n1", extensions: [], rating: 4.2 },
];
const canonical = buildCanonicalQuery(query);

let failed = 0;

try {
  process.env.NODE_ENV = "production";
  process.env.INTENT_INTELLIGENCE_APPLY_ENABLED = "true";
  process.env.INTENT_INTELLIGENCE_PROD_APPLY = "true";
  delete process.env.INTENT_INTELLIGENCE_CANARY_APPLY;

  const prodOn = semanticRerankSearchResults([...products], query, canonical);
  const prodOnLinks = prodOn.map((p) => p.link).join("|");
  const prodOnMeta = buildIntentProductionApplyMeta({
    intentApply: buildIntentApplyMeta({ query, canonicalQuery: canonical, products: prodOn }),
  });

  process.env.INTENT_INTELLIGENCE_APPLY_ENABLED = "false";
  if (isIntentIntelligenceApplyEnabled()) {
    failed += 1;
    console.error("FAIL hard rollback flag still enabled");
  }
  const rollbackOff = semanticRerankSearchResults([...products], query, canonical);
  const offLinks = rollbackOff.map((p) => p.link).join("|");
  const offMeta = buildIntentProductionApplyMeta({
    intentApply: buildIntentApplyMeta({ query, canonicalQuery: canonical, products: rollbackOff }),
  });

  delete process.env.INTENT_INTELLIGENCE_APPLY_ENABLED;
  process.env.INTENT_INTELLIGENCE_APPLY_ENABLED = "true";
  const restored = semanticRerankSearchResults([...products], query, canonical);
  const restoreLinks = restored.map((p) => p.link).join("|");

  process.env.INTENT_INTELLIGENCE_PROD_APPLY = "false";
  delete process.env.INTENT_INTELLIGENCE_CANARY_APPLY;
  const prodFlagOff = semanticRerankSearchResults([...products], query, canonical);
  const prodFlagOffLinks = prodFlagOff.map((p) => p.link).join("|");

  const rollbackInstant = offLinks === prodFlagOffLinks;
  const applyRestored = restoreLinks === prodOnLinks;
  const modeOff = offMeta.rolloutMode === "off" && !offMeta.active;

  if (!rollbackInstant) {
    failed += 1;
    console.error("FAIL instant rollback mismatch", { prodOnLinks, offLinks, prodFlagOffLinks });
  } else {
    console.log("OK instant rollback:", offLinks);
  }

  if (!applyRestored) {
    failed += 1;
    console.error("FAIL apply restore mismatch", { prodOnLinks, restoreLinks });
  } else {
    console.log("OK apply restore matches production ON");
  }

  if (!modeOff) {
    failed += 1;
    console.error("FAIL rollout mode not off after rollback", offMeta);
  } else {
    console.log(`OK rollout mode=${resolveIntentRolloutMode()} after rollback`);
  }

  saveValidationRun(
    {
      suite: "intent-prod-rollback",
      phase: "P4.3",
      prodOnLinks,
      offLinks,
      prodFlagOffLinks,
      restoreLinks,
      rollbackInstant,
      applyRestored,
      modeOff,
      pass: failed === 0,
    },
    "intent-prod-rollback"
  );
} finally {
  restore();
}

if (failed) process.exit(1);
console.log("\nIntent production rollback passed");
