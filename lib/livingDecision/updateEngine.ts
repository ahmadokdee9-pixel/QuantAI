/**
 * Domain-agnostic Living Decision update engine.
 * Products, flights, hotels, subscriptions — same change pipeline.
 */

import { detectDecisionChanges } from "@/lib/decisionMemory/changeDetection";
import type { DecisionChange, DecisionMemoryWriteInput } from "@/lib/decisionMemory/types";
import { resolveLivingDecisionId, resolveThreadKey } from "@/lib/livingDecision/identity";
import type { LivingUpdateEngineInput } from "@/lib/livingDecision/types";

export type PriorLivingSnapshot = {
  decisionId?: string | null;
  decision: string;
  confidence: number | null;
  price: number | null;
  availability: string | null;
  rating?: number | null;
  stockState?: string | null;
  merchant?: string | null;
  provider?: string | null;
  domain?: string | null;
};

/** Run change detection + attach permanent decision id for any domain. */
export function prepareLivingDecisionUpdate(args: {
  input: LivingUpdateEngineInput;
  previous: PriorLivingSnapshot | null | undefined;
  userScope?: string | null;
}): {
  write: DecisionMemoryWriteInput;
  changes: DecisionChange[];
  decisionId: string;
  memoryIdentity: string;
} {
  const { input, previous, userScope } = args;
  const domain = input.domain || "product";
  const memoryIdentity = resolveThreadKey({
    memoryIdentity: input.memoryIdentity,
    productLink: input.productLink,
    domain,
  });
  const decisionId = resolveLivingDecisionId({
    existingDecisionId: previous?.decisionId,
    userScope,
    memoryIdentity,
    productLink: input.productLink,
    domain,
  });

  const writeBase: DecisionMemoryWriteInput = {
    searchQuery: input.searchQuery ?? null,
    productId: input.memoryIdentity || input.productLink,
    productLink: input.productLink.trim(),
    productTitle: input.productTitle ?? null,
    merchant: input.merchant ?? null,
    image: input.image ?? null,
    decision: input.decision,
    confidence: input.confidence ?? null,
    price: input.price ?? null,
    score: input.score ?? null,
    reasons: input.reasons ?? [],
    availability: input.availability ?? null,
    watched: input.watched,
    domain,
    memoryIdentity,
    evidence: input.evidence ?? [],
    sourceFreshnessAt: input.sourceFreshnessAt ?? null,
    decisionId,
    rating: input.rating ?? null,
    provider: input.provider ?? input.merchant ?? null,
    stockState: input.stockState ?? null,
    betterAlternativeTitle: input.betterAlternativeTitle ?? null,
  };

  const changes = detectDecisionChanges(
    previous
      ? {
          decision: previous.decision,
          confidence: previous.confidence,
          price: previous.price,
          availability: previous.availability,
          rating: previous.rating ?? null,
          stockState: previous.stockState ?? null,
          merchant: previous.merchant ?? null,
          provider: previous.provider ?? null,
          domain: previous.domain ?? domain,
        }
      : null,
    writeBase
  );

  return { write: { ...writeBase, changes }, changes, decisionId, memoryIdentity };
}
