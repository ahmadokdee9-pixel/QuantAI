/**
 * Critical Hardening regression — C-01 / C-02.
 * Fixtures match production adversarial reproductions exactly.
 *
 * Usage: npx tsx scripts/test-critical-decision-run.mjs
 */
import assert from "node:assert/strict";
import {
  C01_EXTRA_INVALID_PAYLOADS,
  C01_HOSTILE_HOTEL_PAYLOAD,
  C02_PRODUCT_NULL_DECISION_PAYLOAD,
} from "../lib/universalDecision/criticalDecisionRunFixtures.ts";
import { validateDecisionRunRequest } from "../lib/universalDecision/validateDecisionRunRequest.ts";
import {
  isCompleteValidDecision,
  mapDecisionRunOutcome,
} from "../lib/universalDecision/decisionRunResponse.ts";

let failed = 0;
function check(cond, msg) {
  try {
    assert.ok(cond, msg);
    console.log(`[PASS] ${msg}`);
  } catch (e) {
    failed += 1;
    console.error(`[FAIL] ${msg}`, e instanceof Error ? e.message : e);
  }
}

console.log("=== C-01: hostile / malformed payloads must fail closed ===\n");

{
  const v = validateDecisionRunRequest(C01_HOSTILE_HOTEL_PAYLOAD);
  check(v.ok === false, "C-01 exact payload rejected by schema");
  if (!v.ok) {
    check(v.status === 400, "C-01 status 400");
    check(v.code === "QUERY_HOSTILE", `C-01 code QUERY_HOSTILE (got ${v.code})`);
  }
}

for (const [i, payload] of C01_EXTRA_INVALID_PAYLOADS.entries()) {
  const v = validateDecisionRunRequest(payload);
  check(v.ok === false, `C-01 extra invalid #${i} rejected`);
}

{
  // Even if a hostile query somehow produced a BUY shell, map must fail closed
  const mapped = mapDecisionRunOutcome({
    classification: {
      domain: "hotel",
      confidence: 64,
      reasons: [],
      needsClarification: false,
      clarifyingQuestion: null,
      normalizedQuery: C01_HOSTILE_HOTEL_PAYLOAD.query,
      extracted: {},
    },
    result: {
      decision: {
        version: 1,
        domain: "hotel",
        action: "BUY",
        contextualVerb: "RESERVE",
        confidence: 64,
        domainConfidence: 64,
        executiveSummary: "Reserve: Het Lage Noorden at EUR 36.",
        reasons: [],
        risks: [],
        alternatives: [],
        timing: { today: "", thisWeek: "", thisMonth: "" },
        evidence: [],
        trust: { score: null, label: "", notes: [] },
        constraints: { hard: [], soft: [] },
        sourceFreshness: {
          fetchedAt: new Date().toISOString(),
          maxAgeMs: 1,
          stale: false,
          provider: "test",
          status: "fresh",
        },
        watchable: false,
        memoryIdentity: "test",
        leader: null,
        candidates: [],
        insufficientEvidence: false,
        providerStatus: "live",
        query: C01_HOSTILE_HOTEL_PAYLOAD.query,
        generatedAt: new Date().toISOString(),
      },
      candidates: [],
    },
    decision: {
      version: 1,
      domain: "hotel",
      action: "BUY",
      contextualVerb: "RESERVE",
      confidence: 64,
      domainConfidence: 64,
      executiveSummary: "Reserve: Het Lage Noorden at EUR 36.",
      reasons: [],
      risks: [],
      alternatives: [],
      timing: { today: "", thisWeek: "", thisMonth: "" },
      evidence: [],
      trust: { score: null, label: "", notes: [] },
      constraints: { hard: [], soft: [] },
      sourceFreshness: {
        fetchedAt: new Date().toISOString(),
        maxAgeMs: 1,
        stale: false,
        provider: "test",
        status: "fresh",
      },
      watchable: false,
      memoryIdentity: "test",
      leader: null,
      candidates: [],
      insufficientEvidence: false,
      providerStatus: "live",
      query: C01_HOSTILE_HOTEL_PAYLOAD.query,
      generatedAt: new Date().toISOString(),
    },
    routedToProductPipeline: false,
  });
  check(mapped.ok === false, "C-01 BUY without candidates cannot succeed");
}

console.log("\n=== C-02: success=true with decision=null forbidden ===\n");

{
  const v = validateDecisionRunRequest(C02_PRODUCT_NULL_DECISION_PAYLOAD);
  check(v.ok === true, "C-02 product payload is schema-valid");

  // Exact production engine shape for product forced domain
  const mapped = mapDecisionRunOutcome({
    classification: {
      domain: "product",
      confidence: 100,
      reasons: ["User-corrected domain"],
      needsClarification: false,
      clarifyingQuestion: null,
      normalizedQuery: "MacBook Pro 14",
      extracted: {},
    },
    result: null,
    decision: null,
    routedToProductPipeline: true,
  });

  check(mapped.ok === false, "C-02 mapped outcome is not success");
  if (!mapped.ok) {
    check(mapped.status === 422, "C-02 HTTP semantics 422");
    check(mapped.decision === null, "C-02 decision remains null on failure envelope");
    check(
      mapped.code === "PRODUCT_PIPELINE_REQUIRED",
      `C-02 code PRODUCT_PIPELINE_REQUIRED (got ${mapped.code})`
    );
    check(mapped.routedToProductPipeline === true, "C-02 routedToProductPipeline preserved");
  }

  check(
    isCompleteValidDecision(null, []) === false,
    "C-02 null decision is not complete/valid"
  );
}

console.log("\n=== Valid schema still accepted ===\n");

{
  const v = validateDecisionRunRequest({
    query: "hotel in Paris near the Louvre for 3 nights",
    forcedDomain: "hotel",
  });
  check(v.ok === true, "valid hotel payload accepted");
}

{
  const v = validateDecisionRunRequest({
    query: "flight Amsterdam to Istanbul next Friday",
    forcedDomain: "flight",
  });
  check(v.ok === true, "valid flight payload accepted");
}

if (failed) {
  console.error(`\n${failed} critical decision-run regression(s) failed`);
  process.exit(1);
}
console.log("\nAll critical decision-run regressions passed.");
