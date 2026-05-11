import type { QuantProduct } from "@/lib/shoppingScore";
import { getStoreTrustScore, ratingValue } from "@/lib/shoppingScore";
import type { DealVerdict, FakeDiscountRisk } from "./types";

function h(s: string): number {
  let x = 0;
  for (let i = 0; i < s.length; i++) x = (x << 5) - x + s.charCodeAt(i);
  return Math.abs(x);
}

export function buildListingDealReasoning(
  p: QuantProduct,
  verdict: DealVerdict,
  fakeRisk: FakeDiscountRisk,
  savingsVsFair: number | null,
  peerCheapest: number,
  clusterSize: number,
  categoryLabel: string,
  dataGaps: string[],
  tooGoodToBeTrue: boolean
): string {
  const seed = h(p.link + verdict + String(savingsVsFair ?? 0));
  const store = p.store;
  const vsCheap =
    peerCheapest > 0 && p.price > 0
      ? Math.round(((p.price - peerCheapest) / peerCheapest) * 100)
      : null;
  const trust = getStoreTrustScore(p.store);
  const r = ratingValue(p.rating);
  const gapNote =
    dataGaps.length > 0
      ? ` Feed gaps: ${dataGaps.slice(0, 2).join("; ")}${dataGaps.length > 2 ? "…" : ""}.`
      : "";

  if (tooGoodToBeTrue) {
    return `${store} is dramatically under peer pricing for this ${categoryLabel} cluster with shallow proof—treat it as “verify SKU + seller” before celebrating savings.${gapNote}`;
  }

  if (verdict === "Suspicious discount") {
    return [
      `Anchor pricing on ${store} diverges from sibling listings in this ${categoryLabel} bundle—cross-check MSRP and bundle contents before trusting the headline percent.${gapNote}`,
      `${store} shows a steep cut, but peer anchors here do not support that reference price; QuantAI discounts the discount until you see a credible list price.${gapNote}`,
    ][seed % 2]!;
  }
  if (verdict === "Real deal") {
    return [
      `Discount, trust (${trust}), and peer pricing line up for ${store}—one of the cleaner executions across these ${clusterSize} retailers in ${categoryLabel}.`,
      `${store} lands with a credible markdown versus sibling rows while keeping stars (${r.toFixed(1)}) and trust intact—rare alignment in noisy feeds.${gapNote}`,
    ][seed % 2]!;
  }
  if (verdict === "Strong value") {
    return [
      `Specification-to-price versus peers still favors ${store} in ${categoryLabel} once trust and fulfillment are in the equation—not only the ticket.`,
      `${store} is not always the cheapest pixel in the cluster, but composite value reads strongest when reviews, delivery cues, and retailer index are blended.${gapNote}`,
    ][seed % 2]!;
  }
  if (verdict === "Overpriced") {
    return vsCheap != null && vsCheap > 8
      ? `${store} asks ~${vsCheap}% more than the leanest peer for materially the same title—pay only if warranty, region, or bundle deltas are explicit at checkout.${gapNote}`
      : `${store} sits high in this micro-market for ${categoryLabel}—only proceed if non-price perks are guaranteed before you pay.${gapNote}`;
  }
  if (verdict === "Wait for lower pricing") {
    return [
      `Momentum and peer anchors both suggest patience for ${store}—either pricing drifts toward the cluster median or a fresher listing appears with clearer proof.`,
      `Composite likes the product story more than the ticket on ${store}; unless stock is truly scarce, waiting often buys you information.${gapNote}`,
    ][seed % 2]!;
  }
  if (verdict === "Compare carefully") {
    return [
      `No single axis dominates for ${store}—split the decision across trust (${trust}), fulfillment, and final checkout math in this ${categoryLabel} set.`,
      `Peer titles are close but not identical; compare warranty, SKU parity, and return language before a small price gap decides.${gapNote}`,
    ][seed % 2]!;
  }
  if (fakeRisk === "high") {
    return `Synthetic-feeling markdown on ${store}: trust the cluster median more than the strikethrough until a second source confirms the anchor.${gapNote}`;
  }
  return `${store} is mid-pack in this cluster—use the comparison table to choose whether you optimize price, trust (${trust}), or delivery.${gapNote}`;
}
