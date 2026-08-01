/**
 * Client helper — persist Instant Decision episodes without modifying Instant Decision UI.
 */

import {
  listLocalEpisodesForLink,
  markLocalDecisionWatched,
  recordLocalDecisionMemory,
} from "@/lib/decisionMemory/clientMemory";
import type { DecisionAction, DecisionMemoryWriteInput } from "@/lib/decisionMemory/types";
import { resolveExecutiveAction } from "@/lib/ui/instantDecisionModel";
import type { UniversalProductDecision } from "@/lib/ui/universalProductDecision";
import { ratingValue, type QuantProduct } from "@/lib/shoppingScore";
import type { DecisionBriefDTO } from "@/lib/intelligence/decisionBriefEngine";
import type { UniversalDecision } from "@/lib/universalDecision/types";
import { buildLivingDecisionThread } from "@/lib/livingDecision/timeline";
import type { LivingDecisionThread } from "@/lib/livingDecision/types";
import { resolveThreadKey } from "@/lib/livingDecision/identity";

function stockFromAvailability(availability: string | null | undefined): string | null {
  const a = (availability || "").toLowerCase();
  if (!a) return null;
  if (/(out of stock|sold out|unavailable)/.test(a)) return "out_of_stock";
  if (/(in stock|available|ships)/.test(a)) return "in_stock";
  if (/limited|low stock/.test(a)) return "limited";
  return a.slice(0, 48);
}

export function buildDecisionWriteFromLeader(args: {
  product: QuantProduct;
  universal: UniversalProductDecision;
  searchQuery?: string;
  brief?: DecisionBriefDTO | null;
  betterAlternativeTitle?: string | null;
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

  const memoryIdentity = resolveThreadKey({
    memoryIdentity: `product:${product.link}`,
    productLink: product.link,
    domain: "product",
  });

  const evidence = [
    product.price > 0
      ? { id: "price", label: "Price", value: `€${Math.round(product.price)}`, kind: "fact" }
      : null,
    product.store
      ? { id: "merchant", label: "Merchant", value: product.store, kind: "fact" }
      : null,
    ratingValue(product.rating) > 0
      ? { id: "rating", label: "Rating", value: String(ratingValue(product.rating)), kind: "fact" }
      : null,
    product.availability
      ? { id: "availability", label: "Availability", value: product.availability, kind: "fact" }
      : null,
  ].filter(Boolean);

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
    domain: "product",
    memoryIdentity,
    evidence,
    sourceFreshnessAt: new Date().toISOString(),
    rating: ratingValue(product.rating) > 0 ? ratingValue(product.rating) : null,
    provider: product.store || null,
    stockState: stockFromAvailability(product.availability),
    betterAlternativeTitle: args.betterAlternativeTitle ?? null,
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
  const alt = decision.alternatives[0]?.title || null;
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
    rating:
      leader?.raw && typeof (leader.raw as { rating?: unknown }).rating === "number"
        ? Number((leader.raw as { rating: number }).rating)
        : null,
    provider: decision.sourceFreshness.provider || leader?.merchant || null,
    stockState: stockFromAvailability(leader?.availability),
    betterAlternativeTitle: alt,
  };
}

/** Persist decision episode (local always; server when signed in). */
export async function persistDecisionEpisode(
  input: DecisionMemoryWriteInput,
  opts?: { signedIn?: boolean }
): Promise<DecisionMemoryWriteInput> {
  recordLocalDecisionMemory(input);

  if (!opts?.signedIn) return input;

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
  return input;
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

/** Load living decision thread for Instant Decision History (local + optional server). */
export async function loadLivingDecisionThread(args: {
  productLink: string;
  signedIn?: boolean;
  decisionId?: string | null;
}): Promise<LivingDecisionThread | null> {
  const key = (args.decisionId || args.productLink || "").trim();
  if (!key) return null;

  if (args.signedIn) {
    try {
      const res = await fetch(
        `/api/intelligence/decision-memory?history=1&link=${encodeURIComponent(key)}&living=1`,
        { credentials: "same-origin" }
      );
      if (res.ok) {
        const json = (await res.json()) as {
          thread?: LivingDecisionThread | null;
          episodes?: unknown[];
        };
        if (json.thread) return json.thread;
      }
    } catch {
      // fall through to local
    }
  }

  const local = listLocalEpisodesForLink(args.productLink);
  return buildLivingDecisionThread(local);
}
