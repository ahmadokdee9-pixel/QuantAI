/**
 * QuantAI product family graph — pairwise relationship labels inside a matched cluster.
 */

import type { QuantProduct } from "@/lib/shoppingScore";
import type { ProductIdentity } from "@/lib/deals/productIdentity";
import { getStoreTrustScore, ratingValue } from "@/lib/shoppingScore";
import { buildProductIdentityConfidence } from "@/lib/intelligence/productIdentity";

export type FamilyEdgeKind =
  | "same_exact"
  | "same_family"
  | "alternative"
  | "upgrade"
  | "downgrade"
  | "premium_substitute";

export type FamilyEdge = {
  toLink: string;
  kind: FamilyEdgeKind;
  confidence01: number;
};

function classifyByPriceAndTrust(
  from: QuantProduct,
  to: QuantProduct,
  conf: number
): FamilyEdgeKind {
  if (conf >= 0.88) return "same_exact";
  if (conf >= 0.74) return "same_family";
  const pa = from.price > 0 ? from.price : 1;
  const pb = to.price > 0 ? to.price : 1;
  const ta = getStoreTrustScore(from.store);
  const tb = getStoreTrustScore(to.store);
  const ra = ratingValue(from.rating);
  const rb = ratingValue(to.rating);
  if (pb > pa * 1.12 && tb >= ta - 4 && rb >= ra - 0.35) return "upgrade";
  if (pb < pa * 0.9 && tb >= ta - 2) return "downgrade";
  if (pb > pa * 1.08 && tb >= ta + 6) return "premium_substitute";
  if (conf >= 0.55) return "alternative";
  return "same_family";
}

export function buildFamilyEdgesForListing(
  product: QuantProduct,
  members: QuantProduct[],
  identities: ProductIdentity[],
  medianPrice: number,
  selfIndex: number
): FamilyEdge[] {
  const edges: FamilyEdge[] = [];
  for (let j = 0; j < members.length; j++) {
    if (j === selfIndex) continue;
    const other = members[j]!;
    const conf = buildProductIdentityConfidence(
      product,
      other,
      identities[selfIndex]!,
      identities[j]!,
      medianPrice
    );
    const kind = classifyByPriceAndTrust(product, other, conf);
    edges.push({ toLink: other.link, kind, confidence01: conf });
  }
  return edges.sort((a, b) => b.confidence01 - a.confidence01).slice(0, 6);
}

export function buildFamilyAdjacency(
  members: QuantProduct[],
  identities: ProductIdentity[],
  medianPrice: number
): Map<string, FamilyEdge[]> {
  const m = new Map<string, FamilyEdge[]>();
  members.forEach((p, i) => {
    m.set(p.link, buildFamilyEdgesForListing(p, members, identities, medianPrice, i));
  });
  return m;
}
