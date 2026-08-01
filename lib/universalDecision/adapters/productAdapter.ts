/**
 * PRODUCT adapter — wraps the live shopping decision semantics.
 * The production product pipeline remains /api/search; this adapter
 * provides classification hooks + a thin UniversalDecision projection
 * for memory/router consistency when products are already available.
 */

import { contextualVerbFor } from "@/lib/universalDecision/actions";
import { domainProviderRequirement, hasSerpApiKey } from "@/lib/universalDecision/flags";
import { buildSourceFreshness } from "@/lib/universalDecision/freshness";
import { memoryIdentityFor } from "@/lib/universalDecision/score";
import type { DomainAdapter } from "@/lib/universalDecision/adapters/types";
import type { UniversalDecision } from "@/lib/universalDecision/types";

export const productAdapter: DomainAdapter = {
  domain: "product",
  label: "Product",
  detectIntent: (query) => {
    if (/\b(buy|laptop|phone|headphones|tv|gpu|monitor)\b/i.test(query)) {
      return { domain: "product", confidence: 70, reasons: ["Product purchase language"] };
    }
    return null;
  },
  normalizeQuery: (query) => query.trim(),
  isProviderLive: (env) => hasSerpApiKey(env),
  providerRequirement: domainProviderRequirement("product"),
  async run(input) {
    // Product live ranking runs through /api/search. Adapter returns an
    // insufficient-evidence shell so callers route to the shopping pipeline.
    const generatedAt = new Date().toISOString();
    const live = hasSerpApiKey();
    const decision: UniversalDecision = {
      version: 1,
      domain: "product",
      action: "COMPARE",
      contextualVerb: contextualVerbFor("product", "COMPARE"),
      confidence: live ? 40 : 20,
      domainConfidence: input.classification.confidence,
      executiveSummary: live
        ? "Route this query through QuantAI product search for a live Instant Decision."
        : "Product provider is not configured (SERPAPI_KEY).",
      reasons: ["Product domain uses the live shopping pipeline"],
      risks: live ? [] : ["No shopping provider key configured"],
      alternatives: [],
      timing: {
        today: "Run product search for a priced Instant Decision",
        thisWeek: "Re-check if the tray looks thin",
        thisMonth: "Watchlist watched items for price moves",
      },
      evidence: [],
      trust: { score: null, label: "Deferred to product engine", notes: [] },
      constraints: { hard: [], soft: [] },
      sourceFreshness: buildSourceFreshness({
        fetchedAt: generatedAt,
        maxAgeMs: 15 * 60_000,
        provider: "serpapi:google_shopping",
        available: live,
      }),
      watchable: false,
      memoryIdentity: memoryIdentityFor("product", "pipeline"),
      leader: null,
      candidates: [],
      insufficientEvidence: true,
      clarifyingQuestion: null,
      providerStatus: live ? "live" : "unavailable",
      query: input.query,
      generatedAt,
    };

    return { decision, candidates: [] };
  },
};
