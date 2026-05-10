import type { QuantProduct } from "@/lib/shoppingScore";
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
  clusterSize: number
): string {
  const seed = h(p.link + verdict + String(savingsVsFair ?? 0));
  const store = p.store;
  const vsCheap =
    peerCheapest > 0 && p.price > 0
      ? Math.round(((p.price - peerCheapest) / peerCheapest) * 100)
      : null;

  if (verdict === "Suspicious discount") {
    return [
      `Anchor pricing on ${store} looks detached from what sister listings charge—treat the markdown as marketing until you cross-check MSRP elsewhere.`,
      `${store} shows a steep cut, but peer anchors in this bundle do not support that reference—verify the “was” price before counting savings.`,
    ][seed % 2]!;
  }
  if (verdict === "Real deal") {
    return [
      `Discount, trust, and peer pricing line up—this is one of the cleaner executions in the ${clusterSize}-store bundle.`,
      `${store} lands with a credible markdown versus sibling listings and keeps trust intact—rare combination in noisy feeds.`,
    ][seed % 2]!;
  }
  if (verdict === "Strong value") {
    return [
      `Specification-to-price versus peers favors this row even before promotional theater enters the chat.`,
      `${store} is not the cheapest pixel in the cluster, but composite value still reads strongest once trust and reviews weigh in.`,
    ][seed % 2]!;
  }
  if (verdict === "Overpriced") {
    return vsCheap != null && vsCheap > 8
      ? `${store} asks ~${vsCheap}% more than the leanest peer for materially the same title—pay only if warranty or bundles close that gap.`
      : `${store} sits at the top of this micro-market—only proceed if non-price perks are guaranteed at checkout.`;
  }
  if (verdict === "Wait for lower pricing") {
    return [
      "Momentum and peer anchors both suggest patience—either pricing drifts down or a fresher listing appears.",
      "Composite likes the product story more than the ticket—let carts cool unless urgency is real.",
    ][seed % 2]!;
  }
  if (verdict === "Compare carefully") {
    return [
      "No single axis dominates—split the decision across trust, fulfillment, and final checkout math.",
      "Peer set is noisy: compare warranty and SKU parity before you let a small price gap decide.",
    ][seed % 2]!;
  }
  if (fakeRisk === "high") {
    return "Synthetic-feeling markdown: trust the cluster median more than the strikethrough on this row.";
  }
  return `${store} is mid-pack in this cluster—use the comparison table to see which axis (price, trust, delivery) you want to optimize.`;
}
