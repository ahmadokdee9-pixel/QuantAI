import type { IntelligenceSignals, ListStats, ProductCategorySlug } from "./types";
import { getStoreTrustScore } from "@/lib/retailTrust";
import type { QuantProduct } from "@/lib/shoppingScore";
import { getFinalComposite, ratingValue } from "@/lib/shoppingScore";

export type AdaptiveVerdict =
  | "Strong Buy"
  | "Best Budget Pick"
  | "Premium Choice"
  | "Wait for Better Pricing"
  | "Compare Alternatives"
  | "High Trust Option"
  | "Risky but High Value";

function strHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function variant(mod: number, options: readonly string[]): string {
  return options[strHash(String(mod)) % options.length] ?? options[0]!;
}

type PeerCtx = {
  n: number;
  avgPrice: number;
  cheaperCount: number;
  dearerCount: number;
  avgTrust: number;
  maxRating: number;
  minPrice: number;
  maxPrice: number;
  medianPrice: number;
  higherCompositeCount: number;
};

function buildPeerCtx(p: QuantProduct, peers: QuantProduct[]): PeerCtx {
  const n = peers.length;
  const prices = peers.map((x) => x.price).filter((x) => x > 0);
  const sorted = [...prices].sort((a, b) => a - b);
  const medianPrice = sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0;
  const avgPrice = prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
  const cheaperCount = p.price > 0 ? peers.filter((x) => x.price > 0 && x.price < p.price).length : 0;
  const dearerCount = p.price > 0 ? peers.filter((x) => x.price > 0 && x.price > p.price).length : 0;
  const trusts = peers.map((x) => getStoreTrustScore(x.store));
  const avgTrust = trusts.length ? trusts.reduce((a, b) => a + b, 0) / trusts.length : 0;
  const ratings = peers.map((x) => ratingValue(x.rating)).filter((r) => r > 0);
  const maxRating = ratings.length ? Math.max(...ratings) : 0;
  const minPrice = sorted.length ? sorted[0] : 0;
  const maxPrice = sorted.length ? sorted[sorted.length - 1] : 0;
  const myComp = getFinalComposite(p, peers);
  const higherCompositeCount = peers.filter((x) => getFinalComposite(x, peers) > myComp + 0.5).length;
  return {
    n,
    avgPrice,
    cheaperCount,
    dearerCount,
    avgTrust,
    maxRating,
    minPrice,
    maxPrice,
    medianPrice,
    higherCompositeCount,
  };
}

export function getAdaptiveVerdict(
  p: QuantProduct,
  peers: QuantProduct[],
  _stats: ListStats,
  signals: IntelligenceSignals
): AdaptiveVerdict {
  const c = getFinalComposite(p, peers);
  const t = getStoreTrustScore(p.store);
  const r = ratingValue(p.rating);
  const ctx = buildPeerCtx(p, peers);
  const cheapShare = ctx.n > 1 ? ctx.cheaperCount / (ctx.n - 1) : 0;
  const pricey = ctx.avgPrice > 0 && p.price > ctx.avgPrice * 1.1;
  const budget = ctx.avgPrice > 0 && p.price < ctx.avgPrice * 0.88 && c >= 68;
  const premium = ctx.avgPrice > 0 && p.price > ctx.avgPrice * 1.05 && r >= 4.45 && t >= 74;
  const weakTrustHighValue = t < 62 && signals.pricePerformance >= 72 && c >= 62;
  const waitSignal =
    c < 58 || (pricey && p.priceTrend === "up" && signals.priceFit < 48) || (r > 0 && r < 3.85 && c < 70);

  if (waitSignal) return "Wait for Better Pricing";
  if (weakTrustHighValue) return "Risky but High Value";
  if (t >= 88 && c >= 66 && r >= 3.85 && !(c >= 84 && t >= 76 && r >= 4.15)) return "High Trust Option";
  if (budget && cheapShare >= 0.32) return "Best Budget Pick";
  if (premium) return "Premium Choice";
  if (c >= 84 && t >= 74 && r >= 4.1) return "Strong Buy";
  if (c >= 78 && ctx.higherCompositeCount <= 1 && t >= 70) return "Strong Buy";
  if (ctx.higherCompositeCount >= Math.max(3, Math.ceil(ctx.n * 0.42))) return "Compare Alternatives";
  return "Compare Alternatives";
}

export function getPsychologyInsight(
  p: QuantProduct,
  peers: QuantProduct[],
  _stats: ListStats,
  signals: IntelligenceSignals,
  category: ProductCategorySlug
): string {
  const ctx = buildPeerCtx(p, peers);
  const c = getFinalComposite(p, peers);
  const t = getStoreTrustScore(p.store);
  const r = ratingValue(p.rating);
  const seed = strHash(p.link + p.title);

  if (ctx.avgPrice > 0 && p.price < ctx.avgPrice * 0.82 && r >= 4.0 && category === "electronics") {
    return variant(seed, [
      "Best for students: low outlay versus peers with ratings that still look defensible.",
      "Campus-friendly economics—this row sacrifices little rating depth for a lighter price tag.",
    ]);
  }
  if (signals.pricePerformance >= 78 && c >= 75) {
    return variant(seed, [
      "Best long-term value: specification-to-price ratio reads strong in this basket.",
      "Durability signal: price-to-quality balance outruns most peers at this ask.",
    ]);
  }
  if (t < 60 && signals.pricePerformance >= 70) {
    return variant(seed, [
      "Good performance on paper, weak retailer trust—only pursue if you self-insure the seller.",
      "Value is tempting; trust is the weak leg—read policies before you reward the discount.",
    ]);
  }
  if (r >= 4.5 && ctx.avgPrice > 0 && p.price > ctx.avgPrice * 1.12) {
    return variant(seed, [
      "High rating but overpriced versus the tray—paying a loyalty tax to stars here.",
      "Crowd-pleasing reviews, stiff ask—Compare Alternatives unless warranty justifies the delta.",
    ]);
  }
  if (t >= 86 && r >= 4.2 && signals.reviewDepth < 55) {
    return variant(seed, [
      "Quiet social proof, loud storefront—trust carries more weight than review volume on this row.",
      "Elite-feeling seller, thinner review stack—acceptable if you trust the channel more than the stars.",
    ]);
  }
  if (category === "fashion" && signals.rating >= 70 && signals.priceFit >= 65) {
    return variant(seed, [
      "Fit-and-forget shopping: ratings and price fit both cooperate for wardrobe buys.",
      "Balanced fashion signal—enough love in the reviews without an outlier price.",
    ]);
  }
  if (category === "sports" && signals.pricePerformance >= 72) {
    return variant(seed, [
      "Strong value if performance-per-euro matters more than marginal brand prestige.",
      "Athlete-minded economics: the score rewards output over packaging.",
    ]);
  }
  if (ctx.cheaperCount >= ctx.dearerCount && signals.discountQuality >= 68) {
    return variant(seed, [
      "Markdown-backed entry: discount quality reinforces the price story peers cannot match.",
      "Deal-shaped ask: the feed shows real separation from reference pricing.",
    ]);
  }
  return variant(seed, [
    "Balanced shopper profile: no single dimension dominates—read the breakdown, then decide.",
    "Middle-weight signal set: neither a slam dunk nor a walk-away until context tightens.",
  ]);
}

export function buildProductReasoningNarrative(
  p: QuantProduct,
  peers: QuantProduct[],
  stats: ListStats,
  signals: IntelligenceSignals,
  category: ProductCategorySlug
): string {
  const ctx = buildPeerCtx(p, peers);
  const r = ratingValue(p.rating);
  const t = getStoreTrustScore(p.store);
  const seed = strHash(p.link + String(p.price) + p.store);
  const vsAvg =
    ctx.avgPrice > 0 && p.price > 0 ? Math.round(((ctx.avgPrice - p.price) / ctx.avgPrice) * 100) : null;
  const discountPct =
    p.oldPrice != null && p.oldPrice > p.price ? Math.round(((p.oldPrice - p.price) / p.oldPrice) * 100) : null;

  const clausesA: string[] = [];
  const clausesB: string[] = [];

  if (vsAvg != null && vsAvg >= 10) {
    clausesA.push(
      variant(seed, [
        `This listing undercuts the tray mean by ~${vsAvg}% while keeping retailer trust and satisfaction signals from collapsing.`,
        `Versus peer pricing, you are ~${vsAvg}% under the basket average—unusual headroom unless quality is hiding a flaw.`,
      ])
    );
  } else if (ctx.avgPrice > 0 && p.price > ctx.avgPrice * 1.1) {
    clausesA.push(
      variant(seed + 1, [
        "Ask sits above the peer average, so QuantAI expects ratings or trust to carry the premium—verify both before you rationalize the spend.",
        "Premium positioning in this snapshot: the composite only holds if reviews and storefront friction justify paying more than neighbors.",
      ])
    );
  } else {
    clausesA.push(
      variant(seed + 2, [
        "Price lands near the center of this micro-market—value then hinges on how ratings and trust diverge from the median.",
        "Mid-pack pricing here means the decision is won or lost on trust depth and review texture, not on headline euros alone.",
      ])
    );
  }

  if (t >= ctx.avgTrust + 8 && signals.retailerTrust >= 78) {
    clausesA.push(
      variant(seed + 3, [
        "Retailer trust runs hotter than the typical row in this set, which lowers perceived checkout risk.",
        "Store signal clears the average trust bar in this basket—less guesswork at the policy layer.",
      ])
    );
  } else if (t < ctx.avgTrust - 10) {
    clausesA.push(
      variant(seed + 4, [
        "Retailer trust trails the basket norm—QuantAI keeps the score honest until you validate returns and support paths.",
        "Weaker storefront fingerprint versus peers: savings only count if you accept the operational risk.",
      ])
    );
  }

  if (r >= 4.55 && ctx.maxRating > 0 && r >= ctx.maxRating - 0.12) {
    clausesB.push(
      variant(seed + 5, [
        `Stars (${r.toFixed(1)}) sit at the top of what this search exposes, anchoring buyer satisfaction.`,
        `Rating signal is effectively ceiling-touching (${r.toFixed(1)}) for this tray—peer products rarely beat it cleanly.`,
      ])
    );
  } else if (r > 0 && r < 4.05) {
    clausesB.push(
      variant(seed + 6, [
        "Rating stack is softer than neighbors—pair any discount with a hard look at defect chatter in reviews.",
        "Buyer scores lag the set—either the deal repairs that gap or you should pivot to a higher-star row.",
      ])
    );
  } else if (r > 0) {
    clausesB.push(
      variant(seed + 7, [
        `At ${r.toFixed(1)}★, sentiment is credible but not dominant—let review depth and trust finish the story.`,
        `Middle-band stars (${r.toFixed(1)}) mean the composite leans harder on price fit and retailer trust.`,
      ])
    );
  }

  const rc = p.reviewsCount;
  if (rc != null && stats.maxReviews > 0 && rc >= stats.maxReviews * 0.35 && rc >= 80) {
    clausesB.push(
      variant(seed + 8, [
        `Popularity is real: ${rc.toLocaleString()} reviews drown out one-off noise in the rating signal.`,
        `Volume-backed social proof (${rc.toLocaleString()} reviews) tightens confidence versus thin-listing peers.`,
      ])
    );
  } else if (rc != null && rc < 30 && r > 0) {
    clausesB.push(
      variant(seed + 9, [
        "Thin review history keeps popularity discounted—stars move, but slowly, with fewer voices in the room.",
        "Low headcount on reviews means QuantAI refuses to let a flashy rating float the entire verdict.",
      ])
    );
  }

  if (discountPct != null && discountPct >= 12 && signals.discountQuality >= 65) {
    clausesB.push(
      variant(seed + 10, [
        `A ~${discountPct}% markdown versus the feed anchor reinforces that the price story is intentional, not accidental.`,
        "Discount depth reads authentic—markdown quality props up the composite without hand-waving the ask.",
      ])
    );
  }

  if (category !== "general") {
    clausesB.push(
      variant(seed + 11, [
        `Category lens (${category}) nudges weights toward what buyers in this aisle actually optimize for.`,
        `The ${category} profile tilts the engine—signals that matter in this aisle matter more in your score.`,
      ])
    );
  }

  const a0 = clausesA[0];
  const b0 = clausesB[0];
  const a1 = clausesA[1];
  if (a0 && b0) return `${a0} ${b0}`;
  if (a0 && a1) return `${a0} ${a1}`;
  if (a0) return a0;
  if (b0) return b0;
  return "QuantAI blends peer-relative price, trust, reviews, and category priors—this row sits in the middle until a clearer edge appears.";
}

export type NarrativeConfidence = {
  confidence: string;
  uncertainty: string;
  missing: string[];
  weak: string[];
};

export function buildNarrativeConfidence(
  p: QuantProduct,
  peers: QuantProduct[],
  _stats: ListStats,
  signals: IntelligenceSignals
): NarrativeConfidence {
  const c = getFinalComposite(p, peers);
  const spread =
    Math.max(
      signals.priceFit,
      signals.rating,
      signals.reviewDepth,
      signals.retailerTrust,
      signals.pricePerformance
    ) -
    Math.min(
      signals.priceFit,
      signals.rating,
      signals.reviewDepth,
      signals.retailerTrust,
      signals.pricePerformance
    );
  const confidence =
    c >= 80 && spread <= 36
      ? "Signals align: composite is high and sub-scales disagree politely—Decision Confidence is firm for this snapshot."
      : c >= 70
        ? "Solid composite with normal tension between price and trust—Decision Confidence is workable, not absolute."
        : "Composite is guarded; one or more legs are noisy—Decision Confidence should stay provisional.";

  const uncertainty =
    peers.length < 8
      ? "Small basket: peer ordering shifts fast when new rows appear—treat ranks as directional."
      : spread > 48
        ? "Wide spread across sub-scales: one hero metric may be masking a laggard—read the weak-signal list."
        : "Residual uncertainty lives in what feeds omit—warranty, bundles, grey imports—always verify live.";

  const missing: string[] = [];
  if (!p.shipping?.trim()) missing.push("No shipping snippet—logistics risk is unknown, not zero.");
  if (p.reviewsCount == null) missing.push("Review count missing—social proof depth is capped in the model.");
  if (ratingValue(p.rating) <= 0) missing.push("No star rating in feed—buyer satisfaction is inferred from peers only.");

  const weak: string[] = [];
  if (signals.retailerTrust < 58) weak.push("Retailer trust signal is the soft underbelly—policies must earn the discount.");
  if (signals.reviewDepth < 45 && ratingValue(p.rating) >= 4.2) weak.push("High stars, shallow reviews—sentiment can swing on a handful of buyers.");
  if (signals.priceFit < 48 && signals.pricePerformance >= 70) weak.push("Value math looks good, price fit does not—confirm you are comparing like-for-like SKUs.");
  if (signals.delivery < 55 && p.shipping) weak.push("Delivery language reads sluggish—opportunity cost is time, not just euros.");

  return { confidence, uncertainty, missing: missing.slice(0, 3), weak: weak.slice(0, 3) };
}
