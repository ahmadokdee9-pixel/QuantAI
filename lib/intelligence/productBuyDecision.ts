import type { QuantProduct } from "@/lib/shoppingScore";
import { listingSignalsRefurbished } from "@/lib/commerce/listingQuality";
import { getFinalComposite, getStoreTrustScore, ratingValue } from "@/lib/shoppingScore";

export type BuyStance = "buy" | "wait" | "compare" | "avoid";

export type ProductBuyDecision = {
  stance: BuyStance;
  stanceLabel: string;
  stanceDetail: string;
  pros: string[];
  cons: string[];
  rankWhy: string;
  headlineVerdict: string;
  buyerFit: string;
};

function median(nums: number[]): number {
  const s = [...nums].sort((a, b) => a - b);
  if (!s.length) return 0;
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
}

/** Heuristic Buy / Wait / Compare / Avoid — uses only tray-visible signals (no new APIs). */
export function buildProductBuyDecision(product: QuantProduct, list: QuantProduct[], rank: number): ProductBuyDecision {
  const qi = getFinalComposite(product, list);
  const trust = getStoreTrustScore(product.store);
  const stars = ratingValue(product.rating);
  const reviews = product.reviewsCount ?? 0;
  const risk = product.qiCommerce?.retailerRiskScore ?? 40;
  const del = product.qiSignals?.delivery ?? 50;
  const prices = list.map((x) => x.price).filter((x) => x > 0);
  const med = median(prices);
  const price = product.price > 0 ? product.price : med;
  const priceVsMed = med > 0 ? price / med : 1;
  const topQi = Math.max(...list.map((x) => getFinalComposite(x, list)));
  const gapToTop = topQi - qi;

  const headlineVerdict =
    product.qiVerdict?.trim() ||
    product.qiCommerce?.buyingVerdict?.trim() ||
    (qi >= 72
      ? "Leads this tray on composite—trusted checkout path if specs match."
      : qi >= 58
        ? "Solid field position—pair with a quick policy scan at checkout."
        : "Softer composite—use as research unless price resets the trade.");

  const pros: string[] = [];
  const cons: string[] = [];

  if (qi >= 62) pros.push(`QI ${qi}/100 in this search field.`);
  if (trust >= 68) pros.push(`Seller trust ${trust}/100—cleaner fulfillment prior.`);
  if (stars >= 4.2 && reviews >= 40)
    pros.push(`${stars.toFixed(1)}★, ${reviews.toLocaleString()} reviews—signal density is real.`);
  if (priceVsMed <= 0.92 && med > 0) pros.push("Priced under visible tray median.");

  if (listingSignalsRefurbished(product)) {
    cons.push("Refurb / open-box lane—warranty and battery merit a hard look.");
  }
  if (trust < 58) cons.push(`Seller trust ${trust}/100—use protected checkout.`);
  if (risk >= 62) cons.push(`Fulfillment risk ${risk}/100—confirm who ships and warranties.`);
  if (stars > 0 && stars < 3.9 && reviews < 25) cons.push("Review depth is thin—scan recent 1–2★ notes.");
  if (del < 48) cons.push("Delivery read is soft—confirm ship-by and carrier.");
  const anomaly = product.qiCommerce?.priceAnomaly;
  if (anomaly === "suspicious_low" || anomaly === "deep_discount") {
    cons.push("Price sits aggressive vs peers—lock the SKU before you pay.");
  }

  let stance: BuyStance = "compare";
  let stanceLabel = "Compare";
  let stanceDetail = "Tight cluster at the top—pin two finalists in Compare before you commit.";
  let buyerFit = "Strong alternative if you prioritize value and like side-by-side proof.";

  if (trust < 44 || qi < 40 || risk >= 72) {
    stance = "avoid";
    stanceLabel = "Avoid for now";
    stanceDetail = "Trust or fulfillment risk dominates—pause until a cleaner row appears.";
    buyerFit = "Capital-preserving move until signals improve.";
  } else if (qi < 52 || trust < 52 || (stars > 0 && stars < 3.7)) {
    stance = "wait";
    stanceLabel = "Wait";
    stanceDetail = "Mixed lane—let a stronger listing or price move come to you.";
    buyerFit = "Disciplined hold until the tray sharpens.";
    if (product.qiPredictive?.timingVerdictLabel) {
      stanceLabel = product.qiPredictive.timingVerdictLabel;
      stanceDetail = product.qiPredictive.narrative.slice(0, 280);
    }
  } else if (rank <= 1 && qi >= 64 && trust >= 58 && gapToTop <= 6) {
    stance = "buy";
    stanceLabel = "Buy-ready";
    stanceDetail = "Top of this tray on balance—confirm returns and exact configuration.";
    buyerFit = "Primary pick when you want the calm default.";
  } else if (rank <= 2 && qi >= 68 && trust >= 62) {
    stance = "buy";
    stanceLabel = "Buy-ready";
    stanceDetail = "High QI with tiered trust—execute once specs line up.";
    buyerFit = "Confident lane for decisive buyers who still read policy footnotes.";
  } else if (gapToTop <= 5 && rank <= 3) {
    stance = "compare";
    stanceLabel = "Compare";
    stanceDetail = "Neck-and-neck with the leader—small deltas in trust or delivery decide it.";
    buyerFit = "Strong alternative if you prioritize value.";
  } else if (priceVsMed <= 0.88 && trust >= 58 && qi >= 55) {
    stance = "buy";
    stanceLabel = "Value buy";
    stanceDetail = "Under median with workable trust—value-forward if the build matches.";
    buyerFit = "Best when budget leads and seller checks stay light.";
  }

  const rankWhy =
    rank === 0
      ? "#1 composite here—price, reviews, and seller trust align."
      : rank <= 2
        ? `#${rank + 1} in the lead pack—often separated by delivery or a few points of trust.`
        : `#${rank + 1} of ${list.length}—Compare surfaces the gap to #1.`;

  return {
    stance,
    stanceLabel,
    stanceDetail,
    pros: pros.slice(0, 3),
    cons: cons.slice(0, 3),
    rankWhy,
    headlineVerdict,
    buyerFit,
  };
}

export type VerdictExpansion = {
  strengths: string;
  risks: string;
  verify: string;
  limits: string;
};

export function buildVerdictExpansion(product: QuantProduct, list: QuantProduct[], d: ProductBuyDecision): VerdictExpansion {
  const trust = getStoreTrustScore(product.store);
  const conf = product.qiCommerce?.confidence;
  const confLine =
    conf != null
      ? `Model confidence ${conf}/100 mirrors signal density in this feed—not a legal read on the seller.`
      : "No structured commerce confidence on this row—weight trust prior and reviews a touch heavier.";

  const strengths =
    d.pros.length > 0
      ? `Strengths · ${d.pros.join(" ")}`
      : "Strengths · neutral composite—no single axis is carrying the win yet.";

  const risks =
    d.cons.length > 0
      ? `Watch · ${d.cons.join(" ")}`
      : "Watch · standard marketplace variance—returns and fulfiller still matter.";

  const verify =
    "At checkout: confirm SKU, landed price, shipper, warranty, and your last two negative reviews.";

  const limits = `Store trust ${trust}/100 is a storefront prior, not legal advice. QI ranks inside this search only.`;

  return { strengths, risks, verify, limits: `${limits} ${confLine}` };
}
