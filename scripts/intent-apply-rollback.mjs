/**
 * P4.1 — Intent apply rollback verification.
 */
import { semanticRerankSearchResults } from "../lib/search/semanticReranker.ts";
import { buildCanonicalQuery } from "../lib/search/canonicalQuery.ts";
import { isIntentIntelligenceApplyEnabled } from "../lib/intent/intentIntelligenceFlags.ts";
import { saveValidationRun } from "./lib/validationHistory.mjs";

const saved = {
  INTENT_INTELLIGENCE_APPLY_ENABLED: process.env.INTENT_INTELLIGENCE_APPLY_ENABLED,
  TASTE_UNIFIED_APPLY_ENABLED: process.env.TASTE_UNIFIED_APPLY_ENABLED,
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
  process.env.TASTE_UNIFIED_APPLY_ENABLED = "false";
  process.env.INTENT_INTELLIGENCE_APPLY_ENABLED = "true";
  const onRanked = semanticRerankSearchResults([...products], query, canonical);
  const onLinks = onRanked.map((p) => p.link).join("|");

  process.env.INTENT_INTELLIGENCE_APPLY_ENABLED = "false";
  if (isIntentIntelligenceApplyEnabled()) {
    failed += 1;
    console.error("FAIL rollback flag still enabled");
  }
  const offRanked = semanticRerankSearchResults([...products], query, canonical);
  const offLinks = offRanked.map((p) => p.link).join("|");

  process.env.INTENT_INTELLIGENCE_APPLY_ENABLED = "true";
  const onAgain = semanticRerankSearchResults([...products], query, canonical);
  const applyRestored = onAgain.map((p) => p.link).join("|") === onLinks;

  if (!applyRestored) {
    failed += 1;
    console.error("FAIL apply restore mismatch", { onLinks, restored: onAgain.map((p) => p.link).join("|") });
  } else {
    console.log("OK rollback OFF:", offLinks);
    console.log("OK apply ON:", onLinks);
    console.log("OK apply restore matches ON");
  }

  saveValidationRun(
    {
      suite: "intent-apply-rollback",
      phase: "P4.1",
      offLinks,
      onLinks,
      pass: failed === 0,
    },
    "intent-apply-rollback"
  );
} finally {
  restore();
}

if (failed) process.exit(1);
console.log("\nIntent apply rollback passed");
