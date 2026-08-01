/**
 * Client helper — persist Instant Decision episodes without modifying Instant Decision UI.
 */

import {
  markLocalDecisionWatched,
  recordLocalDecisionMemory,
} from "@/lib/decisionMemory/clientMemory";
import type { DecisionAction, DecisionMemoryWriteInput } from "@/lib/decisionMemory/types";
import { resolveExecutiveAction } from "@/lib/ui/instantDecisionModel";
import type { UniversalProductDecision } from "@/lib/ui/universalProductDecision";
import type { QuantProduct } from "@/lib/shoppingScore";
import type { DecisionBriefDTO } from "@/lib/intelligence/decisionBriefEngine";
import type { UniversalDecision } from "@/lib/universalDecision/types";

export function buildDecisionWriteFromLeader(args: {
  product: QuantProduct;
  universal: UniversalProductDecision;
  searchQuery?: string;
  brief?: DecisionBriefDTO | null;
}): DecisionMemoryWriteInput {
  const { product, universal, searchQuery = "", brief = null } = args;
  const { action } = resolveExecutiveAction(universal, brief?.recommendation?.label);
  const reasons = [
    universal.primaryReason,
    universal.secondaryReason,
    universal.reasonLine,
    ...(universal.reasonAuthority?.secondaryReasons?.map((r) => r.line) ?? []),
    ...(brief?.keyReasons ?? brief?.why ?? []),
  ]
    .map((line) => (line || "").trim())
    .filter(Boolean)
    .filter((line, index, arr) => arr.indexOf(line) === index)
    .slice(0, 6);

  return {
    searchQuery: searchQuery.trim() || null,
    productId: String(product.id ?? product.link),
    productLink: product.link,
    productTitle: product.title,
    merchant: product.store,
    image: product.image || null,
    decision: action as DecisionAction,
    confidence: universal.confidence,
    price: product.price > 0 ? product.price : null,
    score:
      typeof product.qiComposite === "number"
        ? product.qiComposite
        : universal.productIntelligence?.rankingDecisionRecord?.finalRankScore ?? null,
    reasons,
    availability: product.availability,
    watched: false,
  };
}

/** Map a UniversalDecision into a memory write (domain-independent). */
export function buildDecisionWriteFromUniversal(
  decision: UniversalDecision
): DecisionMemoryWriteInput | null {
  const leader = decision.leader;
  if (!leader && !decision.memoryIdentity) return null;
  const link = leader?.link || decision.memoryIdentity;
  if (!link) return null;
  return {
    searchQuery: decision.query,
    productId: leader?.id ?? decision.memoryIdentity,
    productLink: link,
    productTitle: leader?.title ?? decision.query,
    merchant: leader?.merchant ?? decision.domain,
    image: leader?.image ?? null,
    decision: decision.action,
    confidence: decision.confidence,
    price: leader?.price ?? null,
    score: leader?.score ?? null,
    reasons: decision.reasons.slice(0, 6),
    availability: leader?.availability ?? null,
    watched: false,
    domain: decision.domain,
    memoryIdentity: decision.memoryIdentity,
    contextualVerb: decision.contextualVerb,
    evidence: decision.evidence,
    sourceFreshnessAt: decision.sourceFreshness.fetchedAt,
  };
}

/** Persist decision episode (local always; server when signed in). */
export async function persistDecisionEpisode(
  input: DecisionMemoryWriteInput,
  opts?: { signedIn?: boolean }
): Promise<void> {
  recordLocalDecisionMemory(input);

  if (!opts?.signedIn) return;

  try {
    await fetch("/api/intelligence/decision-memory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(input),
    });
  } catch {
    // Local persistence already succeeded; server sync is best-effort.
  }
}

/** Mark a decision as watched (local + server). */
export async function persistDecisionWatch(
  productLink: string,
  opts?: { signedIn?: boolean; episode?: DecisionMemoryWriteInput | null }
): Promise<void> {
  if (opts?.episode) {
    recordLocalDecisionMemory({ ...opts.episode, watched: true });
  } else {
    markLocalDecisionWatched(productLink);
  }

  if (!opts?.signedIn) return;

  try {
    await fetch("/api/intelligence/decision-memory", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ productLink, watched: true }),
    });
  } catch {
    // Best-effort server sync.
  }
}
