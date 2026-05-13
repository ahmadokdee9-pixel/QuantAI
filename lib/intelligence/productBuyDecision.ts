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
      ? "Strong composite vs this tray — still verify seller and returns."
      : qi >= 58
        ? "Balanced signal set — read the tradeoffs before checkout."
        : "Softer composite — treat as research, not a green light.");

  const pros: string[] = [];
  const cons: string[] = [];

  if (qi >= 62) pros.push(`QI ${qi}/100 vs this search — relative strength in the tray.`);
  if (trust >= 68) pros.push(`Store-trust prior ${trust}/100 — lower heuristic checkout friction.`);
  if (stars >= 4.2 && reviews >= 40) pros.push(`Public feedback density (${stars.toFixed(1)}★, ${reviews.toLocaleString()} reviews) supports star signal.`);
  if (priceVsMed <= 0.92 && med > 0) pros.push("Listed below tray median on visible asks — price position helps.");

  if (listingSignalsRefurbished(product)) {
    cons.push("Listing reads refurbished / open-box / renewed — confirm warranty, battery, and SKU vs new retail.");
  }
  if (trust < 58) cons.push(`Trust prior ${trust}/100 — manually confirm seller identity and policy pages.`);
  if (risk >= 62) cons.push(`Retailer-risk heuristic ${risk}/100 — extra scrutiny on warranty and fulfilment.`);
  if (stars > 0 && stars < 3.9 && reviews < 25) cons.push("Thin or mixed star signal — read recent negatives, not just the headline score.");
  if (del < 48) cons.push("Delivery-language confidence is weak — confirm lead times and who ships.");
  const anomaly = product.qiCommerce?.priceAnomaly;
  if (anomaly === "suspicious_low" || anomaly === "deep_discount") {
    cons.push("Price looks aggressive vs peers — confirm SKU match and final checkout total.");
  }

  let stance: BuyStance = "compare";
  let stanceLabel = "Compare";
  let stanceDetail =
    "Sits in the competitive band — pin peers in Compare lab before you anchor on one checkout.";
  let buyerFit = "Generalist cart — weigh price vs trust with your personal risk budget.";

  if (trust < 44 || qi < 40 || risk >= 72) {
    stance = "avoid";
    stanceLabel = "Avoid for now";
    stanceDetail = "Trust, composite, or retailer-risk heuristics flag elevated checkout risk — skip or dig much deeper first.";
    buyerFit = "Not a default pick for cautious buyers until signals improve.";
  } else if (qi < 52 || trust < 52 || (stars > 0 && stars < 3.7)) {
    stance = "wait";
    stanceLabel = "Wait / research";
    stanceDetail = "Signals are not decisive enough to treat as buy-ready — gather seller proof or wait for cleaner listings.";
    buyerFit = "Patience-first — better after more verification or a stronger alternative appears.";
  } else if (rank <= 1 && qi >= 64 && trust >= 58 && gapToTop <= 6) {
    stance = "buy";
    stanceLabel = "Buy-ready";
    stanceDetail = "Top-lane composite with acceptable trust for many buyers — still confirm returns and SKU at checkout.";
    buyerFit = "Strong fit if you want the tray’s current best-balanced execution pick.";
  } else if (rank <= 2 && qi >= 68 && trust >= 62) {
    stance = "buy";
    stanceLabel = "Buy-ready";
    stanceDetail = "High composite and trust priors — good candidate if specs match your need.";
    buyerFit = "Performance-first buyers who still read policy pages.";
  } else if (gapToTop <= 5 && rank <= 3) {
    stance = "compare";
    stanceLabel = "Compare";
    stanceDetail = "Near the top on composite — small listing changes could reorder; run a side-by-side verdict.";
    buyerFit = "Analytical buyers who like to stress-test two finalists.";
  } else if (priceVsMed <= 0.88 && trust >= 58 && qi >= 55) {
    stance = "buy";
    stanceLabel = "Value buy";
    stanceDetail = "Price sits under median with workable trust — attractive if specs line up.";
    buyerFit = "Budget-conscious shoppers who accept some seller homework.";
  }

  const rankWhy =
    rank === 0
      ? "Ranked #1 in this tray on composite (QI) — blends price position, reviews, and store trust vs peers."
      : rank <= 2
        ? `Ranked #${rank + 1} — still in the leading pack; differences vs #1 are often trust, reviews, or euros.`
        : `Ranked #${rank + 1} of ${list.length} — further from the composite leader; Compare lab helps explain the gap.`;

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
      ? `Structured model confidence ${conf}/100 reflects signal density in this feed—not a guarantee of seller quality.`
      : "No structured commerce confidence on this row — lean more on trust prior, reviews, and manual seller checks.";

  const strengths =
    d.pros.length > 0
      ? `What reads well: ${d.pros.join(" ")}`
      : "What reads well: composite and trust are in a neutral band — no single axis screams outlier advantage.";

  const risks =
    d.cons.length > 0
      ? `What to watch: ${d.cons.join(" ")}`
      : "What to watch: standard marketplace variance still applies—read return windows and who fulfils.";

  const verify =
    "Before paying: confirm SKU/condition, final landed price, who ships, warranty scope, and recent 1–2★ reviews for your region.";

  const limits = `Store-trust ${trust}/100 is a prior from storefront heuristics, not a legal verdict. QI ranks within this search only.`;

  return { strengths, risks, verify, limits: `${limits} ${confLine}` };
}
