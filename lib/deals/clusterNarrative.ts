import type { QuantProduct } from "@/lib/shoppingScore";
import { getFinalComposite, getStoreTrustScore } from "@/lib/shoppingScore";
import type { ListingDealInsight } from "./types";
import type { ProductIdentity } from "./productIdentity";
import { combinedTitleSimilarity } from "./normalizeTitle";

function median(nums: number[]): number {
  const s = [...nums].sort((a, b) => a - b);
  if (!s.length) return 0;
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
}

export function buildMatchSignalsSummary(
  listings: QuantProduct[],
  identities: ProductIdentity[]
): string {
  if (listings.length < 2) return "Single listing—no cross-store identity graph.";
  let idHits = 0;
  let brandHits = 0;
  let modelHits = 0;
  for (let i = 0; i < listings.length; i++) {
    for (let j = i + 1; j < listings.length; j++) {
      const ai = identities[i]!;
      const bi = identities[j]!;
      const sharedId = ai.identifiers.some((x) => bi.identifiers.includes(x));
      if (sharedId) idHits++;
      const sb = new Set(bi.brands);
      if (ai.brands.some((b) => sb.has(b))) brandHits++;
      const sm = new Set(bi.models.map((m) => m.toLowerCase()));
      if (ai.models.some((m) => sm.has(m.toLowerCase()))) modelHits++;
    }
  }
  const pairs = (listings.length * (listings.length - 1)) / 2;
  const titlePairs: number[] = [];
  for (let i = 0; i < listings.length; i++) {
    for (let j = i + 1; j < listings.length; j++) {
      titlePairs.push(combinedTitleSimilarity(listings[i]!.title, listings[j]!.title));
    }
  }
  const medTitle = median(titlePairs);
  const parts: string[] = [];
  parts.push(
    `Title similarity median ≈ ${Math.round(medTitle * 100)}% across ${pairs} store pairs (language-folded tokens + n-grams).`
  );
  if (idHits) parts.push(`Shared catalog IDs detected in ${idHits} pair(s)—strong anchor for grouping.`);
  if (modelHits) parts.push(`Model tokens overlap in ${modelHits} pair(s).`);
  if (brandHits) parts.push(`Brand cues align in ${brandHits} pair(s).`);
  if (!idHits && medTitle < 0.42)
    parts.push("No hard IDs in feed—grouping is probabilistic; verify SKU photos and specs at checkout.");
  return parts.join(" ");
}

export function buildGroupingRationale(
  listings: QuantProduct[],
  identities: ProductIdentity[],
  categoryLabel: string
): string {
  if (listings.length < 2) return "";
  const sharedModels = new Set(identities[0]!.models);
  for (let i = 1; i < identities.length; i++) {
    const next = new Set(identities[i]!.models);
    for (const x of [...sharedModels]) {
      if (!next.has(x)) sharedModels.delete(x);
    }
  }
  const sharedBrands = new Set(identities[0]!.brands);
  for (let i = 1; i < identities.length; i++) {
    const next = new Set(identities[i]!.brands);
    for (const x of [...sharedBrands]) {
      if (!next.has(x)) sharedBrands.delete(x);
    }
  }
  const idUnion = new Set<string>();
  identities.forEach((id) => id.identifiers.forEach((x) => idUnion.add(x)));
  const reasons: string[] = [];
  reasons.push(
    `QuantAI treats these ${listings.length} rows as one ${categoryLabel} cluster because independent signals—not a single magic string—overlap.`
  );
  if (idUnion.size)
    reasons.push(
      `Structured identifiers (${[...idUnion].slice(0, 3).join(", ")}${idUnion.size > 3 ? "…" : ""}) reinforce the match where present.`
    );
  if (sharedModels.size)
    reasons.push(`Recurring model tokens (${[...sharedModels].slice(0, 4).join(", ")}) tie different merchant copy together.`);
  else if (sharedBrands.size)
    reasons.push(`Shared brand anchors (${[...sharedBrands].join(", ")}) plus fuzzy titles bridge retailer wording gaps.`);
  else
    reasons.push(
      "Without hard SKUs, the engine leans on fuzzy title geometry and price sanity—still useful, but not courtroom-grade identity proof."
    );
  return reasons.join(" ");
}

export function buildHiddenRisksNote(
  listings: QuantProduct[],
  insights: ListingDealInsight[],
  suspiciousCluster: boolean
): string {
  const lowTrust = listings.filter((p) => getStoreTrustScore(p.store) < 58).length;
  const thinReviews = listings.filter((p) => (p.reviewsCount ?? 0) < 12).length;
  const highFake = insights.filter((i) => i.fakeDiscountRisk === "high").length;
  const chunks: string[] = [];
  if (suspiciousCluster || highFake)
    chunks.push("At least one listing shows discount language that peers do not price—anchor prices before trusting the headline percent.");
  if (lowTrust >= Math.ceil(listings.length / 2))
    chunks.push("Half or more of the tray is from lower-trust merchants—warranty and returns deserve extra scrutiny.");
  if (thinReviews >= listings.length - 1)
    chunks.push("Review depth is thin across the cluster; star averages move quickly with a handful of votes.");
  if (!chunks.length)
    chunks.push(
      "Residual risks are ordinary: bundle contents, warranty region, and refurbished vs new wording can still diverge despite similar titles."
    );
  return chunks.join(" ");
}

export function buildWhenCheapestNotBest(
  listings: QuantProduct[],
  picks: { bestOverall: string; bestBudget: string },
  insights: ListingDealInsight[]
): string | null {
  if (picks.bestOverall === picks.bestBudget) return null;
  const overall = listings.find((p) => p.link === picks.bestOverall);
  const cheap = listings.find((p) => p.link === picks.bestBudget);
  if (!overall || !cheap) return null;
  const io = insights.find((i) => i.link === overall.link);
  const ic = insights.find((i) => i.link === cheap.link);
  if (!io || !ic) return null;
  const trustO = getStoreTrustScore(overall.store);
  const trustC = getStoreTrustScore(cheap.store);
  const delO = overall.qiSignals?.delivery ?? 50;
  const delC = cheap.qiSignals?.delivery ?? 50;
  if (trustO - trustC >= 12 || delO - delC >= 18 || io.dealQualityScore - ic.dealQualityScore >= 8) {
    return `Cheapest is ${cheap.store}, but best overall is ${overall.store}: QuantAI weighs trust (${trustO} vs ${trustC}), fulfillment signals, and discount authenticity—not euros alone.`;
  }
  return null;
}

export function buildRetailTrustNote(listings: QuantProduct[]): string {
  const scores = listings.map((p) => getStoreTrustScore(p.store));
  const hi = Math.max(...scores);
  const lo = Math.min(...scores);
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  return `Trust band spans ${lo}–${hi} (mean ${avg.toFixed(0)}) on QuantAI’s retailer index—wide spreads mean the “same” title can carry different post-purchase risk.`;
}

export function buildUncertaintyNote(
  listings: QuantProduct[],
  completeness: "high" | "medium" | "low"
): string {
  const missingShip = listings.filter((p) => !p.shipping?.trim()).length;
  const missingOld = listings.filter((p) => p.oldPrice == null).length;
  const parts: string[] = [];
  if (completeness === "low")
    parts.push("Data completeness is low—QuantAI will not treat any verdict as guaranteed; use this tray as triage, not a receipt.");
  else if (completeness === "medium")
    parts.push("Some signals are missing (reviews, list prices, or shipping copy); scores blend safe defaults where gaps exist.");
  else parts.push("Signals are reasonably complete for a shopping feed, but live checkout can still diverge.");
  if (missingShip) parts.push(`${missingShip}/${listings.length} rows lack shipping text—delivery scores are partially inferred.`);
  if (missingOld === listings.length) parts.push("No reliable “was” prices in the feed—discount authenticity leans on peer pricing, not strikethroughs.");
  return parts.join(" ");
}

export function buildPrimaryRecommendation(args: {
  listings: QuantProduct[];
  insights: ListingDealInsight[];
  suspiciousCluster: boolean;
  clusterConfidence: number;
}): { action: "buy_now" | "compare" | "wait"; reason: string } {
  const { listings, insights, suspiciousCluster, clusterConfidence } = args;
  if (!insights.length) {
    return {
      action: "compare",
      reason: "Insufficient rows to score—compare listings manually before purchase.",
    };
  }
  const best = insights.reduce((a, b) => (a.dealQualityScore >= b.dealQualityScore ? a : b));
  const bestP = listings.find((p) => p.link === best.link);
  const comp = bestP ? getFinalComposite(bestP, listings) : 0;
  const waits = insights.filter((i) => i.buyVsWait === "wait").length;
  const predictiveLead = best.predictiveTimingLabel ?? bestP?.qiPredictive?.timingVerdictLabel;

  if (suspiciousCluster || clusterConfidence < 42) {
    return {
      action: "compare",
      reason:
        "Cluster confidence or discount hygiene is weak—compare checkout totals, return windows, and SKU photos before committing.",
    };
  }
  if (waits >= Math.ceil(insights.length * 0.55)) {
    return {
      action: "wait",
      reason: predictiveLead
        ? `${predictiveLead}: most rows skew toward patience—pricing or trust does not yet justify an impulse checkout across this peer set.`
        : "Most rows skew toward patience: pricing or trust does not yet justify an impulse checkout across this peer set.",
    };
  }
  if (best.buyVsWait === "buy_now" && comp >= 78 && best.dealVerdict !== "Suspicious discount") {
    return {
      action: "buy_now",
      reason: predictiveLead
        ? `${predictiveLead}. Lead listing (${listings.find((p) => p.link === best.link)?.store ?? "store"}) clears composite, trust, and discount checks—still verify SKU parity at checkout.`
        : `Lead listing (${listings.find((p) => p.link === best.link)?.store ?? "store"}) clears composite, trust, and discount checks—still verify SKU parity at checkout.`,
    };
  }
  return {
    action: "compare",
    reason:
      "No single row dominates every axis—QuantAI recommends a short compare pass (warranty, delivery, returns) even if one price looks attractive.",
  };
}

export function imageSimilarityPlaceholder(): string {
  return "Image similarity is not available in this feed build—grouping uses titles, extracted IDs, specs, tokens, and price sanity instead.";
}
