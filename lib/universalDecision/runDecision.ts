import { getAdapter } from "@/lib/universalDecision/registry";
import { classifyDecisionDomain } from "@/lib/universalDecision/router";
import { isDomainFeatureEnabled } from "@/lib/universalDecision/flags";
import type {
  DecisionDomain,
  DomainClassification,
  UniversalDecision,
} from "@/lib/universalDecision/types";
import type { AdapterRunResult } from "@/lib/universalDecision/adapters/types";

export type RunUniversalDecisionInput = {
  query: string;
  forcedDomain?: DecisionDomain | null;
  marketCountry?: string | null;
  currency?: string | null;
  signal?: AbortSignal;
};

export type RunUniversalDecisionResult = {
  classification: DomainClassification;
  result: AdapterRunResult | null;
  decision: UniversalDecision | null;
  routedToProductPipeline: boolean;
};

/**
 * Classify + run the matching domain adapter.
 * PRODUCT always routes to the existing /api/search pipeline (no duplicate engine).
 */
export async function runUniversalDecision(
  input: RunUniversalDecisionInput
): Promise<RunUniversalDecisionResult> {
  const classification = classifyDecisionDomain(input.query, {
    forcedDomain: input.forcedDomain,
  });

  if (classification.needsClarification && !input.forcedDomain) {
    return {
      classification,
      result: null,
      decision: null,
      routedToProductPipeline: false,
    };
  }

  if (classification.domain === "product") {
    return {
      classification,
      result: null,
      decision: null,
      routedToProductPipeline: true,
    };
  }

  if (!isDomainFeatureEnabled(classification.domain)) {
    return {
      classification: {
        ...classification,
        needsClarification: true,
        clarifyingQuestion:
          classification.clarifyingQuestion ||
          `The ${classification.domain} domain is not live yet. Search as a product instead?`,
      },
      result: null,
      decision: null,
      routedToProductPipeline: false,
    };
  }

  const adapter = getAdapter(classification.domain);
  if (!adapter) {
    return {
      classification,
      result: null,
      decision: null,
      routedToProductPipeline: false,
    };
  }

  const result = await adapter.run({
    query: adapter.normalizeQuery(input.query, classification.extracted),
    classification,
    marketCountry: input.marketCountry,
    currency: input.currency,
    signal: input.signal,
  });

  return {
    classification,
    result,
    decision: result.decision,
    routedToProductPipeline: false,
  };
}
