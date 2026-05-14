import type { IntelligenceSignals, ListStats, ProductCategorySlug } from "./types";
import { getStoreTrustScore } from "@/lib/retailTrust";
import type { QuantProduct } from "@/lib/shoppingScore";
import { getFinalComposite, ratingValue } from "@/lib/shoppingScore";
import type { CommerceSearchIntents } from "./searchIntentV2";
import { fakeDiscountRisk, peerPriceMedianExcluding } from "@/lib/deals/dealAnalysis";
import { getCategoryPricingEconomics, isStrongValueTerritory } from "./adaptiveDealPricing";
import { tasteProductAlignment01 } from "@/lib/commerce-os";

export type NarrativeIntentCtx = {
  query?: string;
  intents?: CommerceSearchIntents;
  category?: ProductCategorySlug;
};

export type AdaptiveVerdict =
  | "Strong Buy"
  | "Strong Value"
  | "Best Budget Pick"
  | "Budget Winner"
  | "Good Low-Risk Buy"
  | "Fair Price"
  | "Premium Choice"
  | "Wait for Better Pricing"
  | "Watch for a Better Entry"
  | "Peers Lean Cheaper"
  | "Soft Hold: Price Room"
  | "Compare Alternatives"
  | "High Trust Option"
  | "Risky but High Value"
  | "Quiet Luxury Pick"
  | "Looks More Expensive Than It Is"
  | "Luxury Feel Without Luxury Pricing"
  | "Strong Aesthetic-Value Balance"
  | "Premium Vibe at Mid-Range Pricing";

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
  stats: ListStats,
  signals: IntelligenceSignals,
  ctx?: NarrativeIntentCtx
): AdaptiveVerdict {
  const c = getFinalComposite(p, peers);
  const t = getStoreTrustScore(p.store);
  const r = ratingValue(p.rating);
  const ctxPeers = buildPeerCtx(p, peers);
  const cheapShare = ctxPeers.n > 1 ? ctxPeers.cheaperCount / (ctxPeers.n - 1) : 0;
  const category = (ctx?.category ?? "general") as ProductCategorySlug;
  const econ = getCategoryPricingEconomics(category);
  const fair = stats.medianPrice;
  const pricey =
    fair > 0 && p.price > fair * (1.1 + econ.priceyFairHeadroom * 0.55);
  const budget =
    ctxPeers.avgPrice > 0 &&
    p.price < ctxPeers.avgPrice * (0.88 + (econ.lane === "budget" ? 0.035 : 0)) &&
    c >= (econ.lane === "budget" ? 64 : 68);
  const premium =
    ctxPeers.avgPrice > 0 &&
    p.price > ctxPeers.avgPrice * (econ.lane === "emotional" ? 1.02 : 1.05) &&
    r >= (econ.lane === "emotional" ? 4.35 : 4.45) &&
    t >= 74;
  const weakTrustHighValue = t < 62 && signals.pricePerformance >= 72 && c >= 62;
  const intents = ctx?.intents;
  const strongBuyFloor = intents?.longTermValue || intents?.trustedOnly ? 81 : 84;

  const maxReviews = Math.max(...peers.map((x) => x.reviewsCount ?? 0), 1);
  const discN =
    p.oldPrice != null && p.oldPrice > p.price && p.price > 0
      ? Math.round(((p.oldPrice - p.price) / p.oldPrice) * 100)
      : null;
  const fake = fakeDiscountRisk(p, peers, discN, maxReviews);
  const peerMed = peerPriceMedianExcluding(peers, p.link);
  const overpricedVsTray = fair > 0 && p.price > fair * (1.12 + econ.priceyFairHeadroom);
  const underpricedAnomaly =
    peerMed > 0 &&
    p.price < peerMed * 0.58 &&
    (discN ?? 0) > 32 &&
    (p.qiCommerce?.priceAnomaly === "suspicious_low" || fake !== "low");
  const strongValue = isStrongValueTerritory(p, fair, peerMed, t, c, fake, overpricedVsTray, underpricedAnomaly, category);

  const cheapPath =
    fair > 0 &&
    p.price > 0 &&
    p.price <= fair * Math.min(0.97, econ.cheapVsFairRatio + 0.03) &&
    (signals.pricePerformance >= 66 || c >= 56);

  const waitNeed =
    !strongValue &&
    !cheapPath &&
    ((c < 54 && !(t >= 68 && fake === "low" && fair > 0 && p.price <= fair * 0.95)) ||
      (pricey && p.priceTrend === "up" && signals.priceFit < 46) ||
      (r > 0 && r < 3.72 && c < 68));

  const seed = strHash(p.link + (ctx?.query ?? ""));

  if (strongValue || (cheapPath && t >= 62 && c >= 54 && fake !== "high")) {
    if (c >= strongBuyFloor && t >= 74 && r >= 4.08) {
      return variant(seed, ["Strong Buy", "Strong Value"]) as AdaptiveVerdict;
    }
    if (budget && cheapShare >= (econ.lane === "budget" ? 0.24 : 0.32)) {
      return variant(seed, ["Best Budget Pick", "Budget Winner"]) as AdaptiveVerdict;
    }
    if (c >= 76 && t >= 72) {
      return variant(seed, ["Good Low-Risk Buy", "Strong Value", "Fair Price"]) as AdaptiveVerdict;
    }
    if (c >= 66 && t >= 66 && fake === "low") {
      return variant(seed, ["Fair Price", "Good Low-Risk Buy"]) as AdaptiveVerdict;
    }
    return variant(seed, ["Fair Price", "Budget Winner", "Good Low-Risk Buy", "Compare Alternatives"]) as AdaptiveVerdict;
  }

  const taste = intents?.taste;
  const tasteAlign = taste?.hasTasteLayer ? tasteProductAlignment01(p, taste) : 0;
  if (taste?.hasTasteLayer && tasteAlign >= 0.33 && c >= 62 && t >= 64) {
    const ts = taste.tagStrength;
    if ((ts.quiet_luxury ?? 0) >= 0.42 || (ts.old_money ?? 0) >= 0.4) {
      return variant(seed + 60, ["Quiet Luxury Pick", "Strong Aesthetic-Value Balance"]) as AdaptiveVerdict;
    }
    if (
      ((ts.rich_smelling ?? 0) >= 0.42 || (ts.niche_fragrance ?? 0) >= 0.42) &&
      (category === "beauty" || category === "fashion")
    ) {
      return variant(seed + 61, ["Luxury Feel Without Luxury Pricing", "Premium Vibe at Mid-Range Pricing"]) as AdaptiveVerdict;
    }
    if ((ts.expensive_looking ?? 0) >= 0.42 && fair > 0 && p.price <= fair * 1.08) {
      return variant(seed + 62, ["Looks More Expensive Than It Is", "Strong Aesthetic-Value Balance"]) as AdaptiveVerdict;
    }
    if ((ts.gamer_setup ?? 0) >= 0.45 && category === "electronics" && c >= 66) {
      return variant(seed + 63, ["Strong Aesthetic-Value Balance", "Premium Vibe at Mid-Range Pricing"]) as AdaptiveVerdict;
    }
    if ((ts.clean_aesthetic ?? 0) >= 0.45 && tasteAlign >= 0.38 && (category === "electronics" || category === "beauty")) {
      return variant(seed + 64, ["Strong Aesthetic-Value Balance", "Good Low-Risk Buy"]) as AdaptiveVerdict;
    }
  }

  if (weakTrustHighValue && !strongValue) return "Risky but High Value";
  if (waitNeed) {
    return variant(seed + 9, [
      "Watch for a Better Entry",
      "Peers Lean Cheaper",
      "Soft Hold: Price Room",
      "Wait for Better Pricing",
    ]) as AdaptiveVerdict;
  }
  if (t >= 88 && c >= 66 && r >= 3.85 && !(c >= 84 && t >= 76 && r >= 4.15)) return "High Trust Option";
  if (budget && cheapShare >= 0.32) return "Best Budget Pick";
  if (premium) return "Premium Choice";
  if (c >= strongBuyFloor && t >= 74 && r >= 4.1) return "Strong Buy";
  if (c >= 78 && ctxPeers.higherCompositeCount <= 1 && t >= 70) return "Strong Buy";
  if (ctxPeers.higherCompositeCount >= Math.max(3, Math.ceil(ctxPeers.n * 0.42))) return "Compare Alternatives";
  return "Compare Alternatives";
}

export function getPsychologyInsight(
  p: QuantProduct,
  peers: QuantProduct[],
  _stats: ListStats,
  signals: IntelligenceSignals,
  category: ProductCategorySlug,
  nCtx?: NarrativeIntentCtx
): string {
  const ctx = buildPeerCtx(p, peers);
  const c = getFinalComposite(p, peers);
  const t = getStoreTrustScore(p.store);
  const r = ratingValue(p.rating);
  const seed = strHash(p.link + p.title);
  const intents = nCtx?.intents;

  if (intents?.taste?.hasTasteLayer && intents.taste.olfactoryRichIntent01 >= 0.42 && (category === "beauty" || category === "fashion")) {
    const ta = tasteProductAlignment01(p, intents.taste);
    if (ta >= 0.28) {
      return variant(seed + 44, [
        "Taste graph: your language skews rich-scent and identity—QuantAI lifts rows that read niche, blended, and trust-backed over loud discount theater.",
        "Emotional commerce read: olfactory luxury cues in the query—favoring listings whose vocabulary matches longevity and seller hygiene.",
      ]);
    }
  }
  if (
    intents?.taste?.hasTasteLayer &&
    (intents.taste.tagStrength.expensive_looking ?? 0) >= 0.42 &&
    (category === "fashion" || category === "beauty" || category === "electronics")
  ) {
    const ta = tasteProductAlignment01(p, intents.taste);
    if (ta >= 0.3 && signals.pricePerformance >= 68) {
      return variant(seed + 46, [
        "Visual identity match: the tray title signals align with an expensive-looking brief—value is as much perception and trust as spec depth.",
        "Aesthetic-value posture: QuantAI is rewarding listings that look premium-adjacent without forcing you into ultra-luxury pricing.",
      ]);
    }
  }

  if (intents?.fragranceBeauty && (category === "beauty" || category === "fashion")) {
    return variant(seed + 3, [
      "Luxury scent lane: QuantAI is weighting longevity signals and seller hygiene over raw markdown theater.",
      "Fragrance buy: presentation and trust matter as much as stars—this read favors credible luxury cues.",
    ]);
  }
  if (intents?.minimalistStyle && (category === "home" || category === "electronics")) {
    return variant(seed + 5, [
      "Minimalist desk logic: fewer visual compromises score higher—clean modern listings win the calm aesthetic you asked for.",
      "Quiet setup bias: the tray rewards listings that read visually restrained, not busy gamer marketing.",
    ]);
  }
  if (intents?.gaming && intents.portableLight && category === "electronics") {
    return variant(seed + 7, [
      "Portable gaming tension: QuantAI is balancing frame thermals language with weight cues you implied.",
      "Power without the toy-box look—this pick favors mature gaming hardware language in the title.",
    ]);
  }
  if (intents?.alternativeSeeking && ctx.cheaperCount >= 1 && ctx.avgPrice > 0 && p.price < ctx.avgPrice * 0.94) {
    return variant(seed + 11, [
      "Substitute hunt: under-tray pricing plus lexical overlap suggests a smarter alternative to premium anchors.",
      "Better-alternative posture—value and overlap beat brand echo when you asked for “like X but cheaper.”",
    ]);
  }
  if (intents?.qualitySeeking && intents.budget && signals.retailerTrust >= 68) {
    return variant(seed + 13, [
      "Excellent value without major compromise—trust and ratings back a disciplined cheap-not-junk ask.",
      "Tight budget, high bar: QuantAI favored listings where discount depth does not torch seller credibility.",
    ]);
  }
  if (intents?.quietLuxury && signals.rating >= 72) {
    return variant(seed + 17, [
      "Quiet luxury read: understated prestige beats loud discounts—this row fits a stealth-wealth shopping stance.",
      "Old-money calm: premium feel without shouty marketing wins when your language skewed understated.",
    ]);
  }

  if (
    _stats.medianPrice > 0 &&
    p.price > 0 &&
    p.price <= _stats.medianPrice * 0.95 &&
    signals.pricePerformance >= 74 &&
    t >= 64 &&
    (category === "fashion" || category === "beauty")
  ) {
    return variant(seed + 19, [
      "Emotional-value lane: peers and price-performance agree this ask is already fair—optimize for fit, finish, and seller hygiene over bargain FOMO.",
      "Category psychology favors joy-per-euro over list-price theater when the tray says you are not overpaying.",
    ]);
  }

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
