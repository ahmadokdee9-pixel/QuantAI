import type { DealClusterDTO } from "@/lib/deals/types";
import type { QuantProduct } from "@/lib/shoppingScore";
import { getFinalComposite, getStoreTrustScore, ratingValue } from "@/lib/shoppingScore";
import {
  getMarketplaceSellerRiskTier,
  getTrustTierLabel,
  inferStoreRegionHint,
} from "@/lib/retailTrust";
import { inferProductCategory } from "./categoryContext";
import type {
  ConfidenceTier,
  FinalRecommendationKind,
  PersonaCard,
  PersonaId,
  SearchIntelligenceDTO,
  SearchMarketIntel,
  StoreTrustRow,
} from "./searchDecisionTypes";

function median(nums: number[]): number {
  const s = [...nums].sort((a, b) => a - b);
  if (!s.length) return 0;
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
}

function uniqStores(products: QuantProduct[]): string[] {
  const m = new Map<string, string>();
  for (const p of products) {
    const k = p.store.trim().toLowerCase();
    if (!m.has(k)) m.set(k, p.store.trim());
  }
  return [...m.values()].slice(0, 14);
}

function minPriceForStore(products: QuantProduct[], storeLabel: string): number {
  const t = storeLabel.trim().toLowerCase();
  const vals = products
    .filter((p) => p.store.trim().toLowerCase() === t && p.price > 0)
    .map((p) => p.price);
  return vals.length ? Math.min(...vals) : 0;
}

export function inferBasketRegionBias(
  products: QuantProduct[]
): SearchIntelligenceDTO["basketRegionBias"] {
  let us = 0;
  let eu = 0;
  let uk = 0;
  let me = 0;
  let asia = 0;
  for (const p of products) {
    const r = inferStoreRegionHint(p.store);
    if (r === "us") us++;
    else if (r === "eu") eu++;
    else if (r === "uk") uk++;
    else if (r === "me") me++;
    else if (r === "asia") asia++;
  }
  const tot = us + eu + uk + me + asia;
  if (tot < Math.max(1, Math.ceil(products.length * 0.35))) return "unknown";
  const max = Math.max(us, eu, uk, me, asia);
  const n = [us, eu, uk, me, asia].filter((x) => x === max).length;
  if (n > 1) return "mixed";
  if (max === us) return "us";
  if (max === eu) return "eu";
  if (max === uk) return "uk";
  if (max === me) return "me";
  if (max === asia) return "asia";
  return "mixed";
}

function h(s: string): number {
  let x = 0;
  for (let i = 0; i < s.length; i++) x = (x << 5) - x + s.charCodeAt(i);
  return Math.abs(x);
}

function pickCheapestReliable(products: QuantProduct[], minTrust = 74): QuantProduct | null {
  const pool = products.filter((p) => p.price > 0 && getStoreTrustScore(p.store) >= minTrust);
  if (!pool.length) return null;
  return [...pool].sort((a, b) => a.price - b.price)[0] ?? null;
}

function pickMostTrusted(products: QuantProduct[]): QuantProduct | null {
  if (!products.length) return null;
  return [...products].sort(
    (a, b) => getStoreTrustScore(b.store) - getStoreTrustScore(a.store)
  )[0]!;
}

function pickGlobalHero(products: QuantProduct[]): QuantProduct | null {
  if (!products.length) return null;
  return [...products].sort(
    (a, b) => getFinalComposite(b, products) - getFinalComposite(a, products)
  )[0]!;
}

function pickLocalDeal(products: QuantProduct[], bias: SearchIntelligenceDTO["basketRegionBias"]): QuantProduct | null {
  const regionMap: Record<string, SearchIntelligenceDTO["basketRegionBias"][]> = {
    us: ["us"],
    eu: ["eu"],
    uk: ["uk"],
    me: ["me"],
    asia: ["asia"],
  };
  const want = bias !== "unknown" && bias !== "mixed" ? regionMap[bias] : null;
  const pool =
    want != null
      ? products.filter((p) => want.includes(inferStoreRegionHint(p.store)) && p.price > 0)
      : products.filter((p) => p.price > 0);
  if (!pool.length) return null;
  return [...pool].sort((a, b) => a.price - b.price)[0] ?? null;
}

function buildMarketIntel(products: QuantProduct[], clusters: DealClusterDTO[]): SearchMarketIntel {
  const susp = clusters.some((c) => c.suspiciousDiscountCluster);
  const ratingInfl = products.some(
    (p) => ratingValue(p.rating) >= 4.85 && (p.reviewsCount ?? 0) < 22
  );
  const lowRev = products.filter((p) => (p.reviewsCount ?? 0) < 12).length >= Math.ceil(products.length * 0.55);
  const mktVar = products.some((p) => getMarketplaceSellerRiskTier(p.store) !== "low");
  const cheap = [...products].sort((a, b) => (a.price > 0 ? a.price : Infinity) - (b.price > 0 ? b.price : Infinity))[0];
  const cheapTrust = cheap ? getStoreTrustScore(cheap.store) : 100;
  const cheapestNotSafest =
    cheap != null &&
    cheapTrust < 66 &&
    products.some((p) => p.price > (cheap.price || 0) * 1.08 && getStoreTrustScore(p.store) - cheapTrust >= 14);
  const premiumSig = products.some((p) => {
    const prices = products.map((x) => x.price).filter((x) => x > 0);
    const med = median(prices);
    return med > 0 && p.price > med * 1.35 && ratingValue(p.rating) >= 4.2;
  });
  const luxuryWeak = products.some(
    (p) => getStoreTrustScore(p.store) >= 85 && ratingValue(p.rating) < 4.0 && (p.reviewsCount ?? 0) < 30
  );

  return {
    aggressiveFakeDiscount: susp,
    ratingInflationRisk: ratingInfl,
    overpricedPremiumSignal: premiumSig,
    weakLuxuryValue: luxuryWeak,
    lowReviewDepthRisk: lowRev,
    marketplaceVarianceRisk: mktVar,
    cheapestNotSafest,
  };
}

function buyerUncertainty(products: QuantProduct[], clusters: DealClusterDTO[]): number {
  let u = 28;
  const maxRev = Math.max(...products.map((p) => p.reviewsCount ?? 0), 0);
  if (maxRev < 40) u += 14;
  if (products.length < 5) u += 12;
  const avgConf =
    clusters.length > 0
      ? clusters.reduce((a, c) => a + c.clusterDealConfidence, 0) / clusters.length
      : 40;
  u += Math.round((100 - avgConf) * 0.35);
  if (products.some((p) => !p.oldPrice)) u += 6;
  return Math.min(100, Math.max(12, u));
}

function confidenceTier(u: number): ConfidenceTier {
  if (u >= 68) return "verify_manually";
  if (u >= 48) return "low";
  if (u >= 32) return "moderate";
  return "high";
}

function upgradeNote(query: string, products: QuantProduct[]): string | null {
  const slug = inferProductCategory(query, products.map((p) => p.title).join(" "));
  const t = `${query} ${products.map((p) => p.title).join(" ")}`.toLowerCase();
  if (!/(laptop|macbook|phone|iphone|gpu|graphics|headphone|camera|drone)/i.test(t)) return null;
  const med = median(products.map((p) => p.price).filter((x) => x > 0));
  const hi = products.filter((p) => p.price > med * 1.25);
  if (hi.length && med > 0) {
    return `For this ${slug} tray, pricing centers near €${Math.round(med)}; stepping up ~25%+ buys headroom in thermals, optics, or silicon—worth it only if your workload actually saturates the cheaper tier.`;
  }
  return null;
}

function personaCards(
  query: string,
  products: QuantProduct[],
  hero: QuantProduct | null,
  cheapRel: QuantProduct | null
): PersonaCard[] {
  const ids: PersonaId[] = [
    "student",
    "power_user",
    "gamer",
    "family",
    "professional",
    "budget_buyer",
    "luxury_buyer",
    "long_term_value",
    "creator",
    "traveler",
    "small_business",
  ];
  const heroL = hero?.link ?? cheapRel?.link ?? products[0]?.link ?? null;
  const heroS = hero?.store ?? cheapRel?.store ?? products[0]?.store ?? null;
  const seed = h(query + String(products.length));

  return ids.map((id, idx) => {
    const s = h(id + query + idx + seed);
    const fitBase = hero ? getFinalComposite(hero, products) : 55;
    const fit = Math.min(96, Math.max(38, Math.round(fitBase - (idx % 4) * 6 + (s % 9) - 4)));
    const pickL = idx % 3 === 0 && cheapRel ? cheapRel.link : heroL;
    const pickS = idx % 3 === 0 && cheapRel ? cheapRel.store : heroS;

    const templates: Record<
      PersonaId,
      { title: string; v: [string, string]; b: [string, string] }
    > = {
      student: {
        title: "Student",
        v: ["Lean on price + returns", "Prioritize warranty clarity"],
        b: [
          "Optimize for total cost of ownership: tuition-time durability beats marginal specs.",
          "Favor retailers with clear student return windows and obvious seller identity.",
        ],
      },
      power_user: {
        title: "Power user",
        v: ["Spec headroom matters", "Thermals & support beat small savings"],
        b: [
          "You will notice I/O, RAM, and sustained performance—avoid the absolute cheapest if reviews show throttling.",
          "Cross-check firmware, region locks, and warranty transfer before checkout.",
        ],
      },
      gamer: {
        title: "Gamer",
        v: ["Latency & panel honesty", "Marketplace GPU risk"],
        b: [
          "Refresh claims and bundle contents drift across stores—verify the exact SKU and VRR support.",
          "Prefer first-party or tier-1 fulfillment for high-value GPU/console purchases.",
        ],
      },
      family: {
        title: "Family",
        v: ["Safety + easy returns", "Trust over extreme discounts"],
        b: [
          "Household purchases should bias toward hassle-free returns and known fulfillment, not headline % off.",
          "If one store is far cheaper with thin reviews, treat it as homework—not autopilot.",
        ],
      },
      professional: {
        title: "Professional",
        v: ["Invoice & warranty region", "Delivery certainty"],
        b: [
          "Time is the hidden cost—pay modestly more for predictable shipping and business-grade support when deadlines exist.",
          "Confirm VAT/pro forma invoices if you reimburse through a company.",
        ],
      },
      budget_buyer: {
        title: "Budget buyer",
        v: ["Cheapest reliable row", "Avoid fake anchors"],
        b: [
          "Stack peer median pricing against list prices; the best budget move is often the median-trust store, not the outlier.",
          "If Temu/AliExpress-class sellers dominate, widen verification before you celebrate savings.",
        ],
      },
      luxury_buyer: {
        title: "Luxury buyer",
        v: ["Authenticate seller", "Avoid weak-value prestige"],
        b: [
          "Premium positioning without review depth is a red flag—luxury should come with proof, not only price.",
          "Prefer flagship boutiques or tier-1 partners when authenticity matters.",
        ],
      },
      long_term_value: {
        title: "Long-term value",
        v: ["Warranty + repairability", "Stable pricing band"],
        b: [
          "Look for consistent pricing across multiple trusted stores—volatile ladders often hide mismatched SKUs.",
          "Returns and extended support are part of the asset price, not a footnote.",
        ],
      },
      creator: {
        title: "Creator",
        v: ["Color science & I/O", "Avoid thin-market listings"],
        b: [
          "Accessories and panels vary by lot; favor listings with deep reviews on color accuracy and ports.",
          "Creators feel downtime—bias delivery and RMA speed when gigs are on the line.",
        ],
      },
      traveler: {
        title: "Traveler",
        v: ["Weight & plug type", "Global warranty"],
        b: [
          "Voltage/plug bundles differ by region—match the SKU to your home grid even if the price looks global.",
          "Compact SKUs attract grey-market sellers; trust signals matter more than usual.",
        ],
      },
      small_business: {
        title: "Small business",
        v: ["Volume receipts", "Predictable RMA"],
        b: [
          "Optimize for repeatable procurement: same SKU, clear warranty chain, and stable fulfillment.",
          "A few points of trust score often cheaper than a failed RMA week.",
        ],
      },
    };

    const pack = templates[id];
    return {
      id,
      title: pack.title,
      fitScore: fit,
      verdict: pack.v[s % pack.v.length],
      body: pack.b[s % pack.b.length],
      suggestedLink: pickL,
      suggestedStore: pickS,
    };
  });
}

function computeFinal(
  products: QuantProduct[],
  uncertainty: number,
  intel: SearchMarketIntel
): { kind: FinalRecommendationKind; headline: string; body: string } {
  if (!products.length) {
    return {
      kind: "compare_alternatives",
      headline: "No live listings to decide on",
      body: "Run another query or broaden terms—QuantAI needs a product tray before it can issue a purchase stance.",
    };
  }

  const hero = pickGlobalHero(products);
  const comp = hero ? getFinalComposite(hero, products) : 0;
  const trust = hero ? getStoreTrustScore(hero.store) : 0;
  const susp = intel.aggressiveFakeDiscount;
  const riskyMkt = products.filter((p) => getMarketplaceSellerRiskTier(p.store) === "high").length;
  const cheap = [...products].filter((p) => p.price > 0).sort((a, b) => a.price - b.price)[0]!;
  const cheapTrust = getStoreTrustScore(cheap.store);

  if (uncertainty >= 66) {
    return {
      kind: "compare_alternatives",
      headline: "Tray uncertainty high — compare before you buy",
      body: "Review depth, missing list prices, or noisy pricing spread pulled uncertainty up. QuantAI is guiding, not guaranteeing—verify SKU, seller, and returns on your shortlist.",
    };
  }

  if (susp && comp < 74) {
    return {
      kind: "risky_deal",
      headline: "Risky deal environment in this tray",
      body: "Discount storytelling does not line up across global peers. Pause for MSRP checks and seller clarity before you optimize purely on price.",
    };
  }

  if (riskyMkt >= Math.ceil(products.length * 0.35) && cheapTrust < 70) {
    return {
      kind: "cheapest_but_risky",
      headline: "Cheapest path carries marketplace variance",
      body: "Several ultra-low paths route through high-variance marketplaces. If budget forces that route, narrow to top-rated sellers and photograph the unboxing.",
    };
  }

  if (intel.overpricedPremiumSignal && trust >= 82) {
    return {
      kind: "premium_but_overpriced",
      headline: "Premium shelf, uneven proof",
      body: "Some premium-positioned rows sit high versus the peer band without proportional review depth. You may be paying for placement, not performance.",
    };
  }

  if (comp >= 72 && comp < 82 && trust >= 76 && !susp && intel.lowReviewDepthRisk) {
    return {
      kind: "hidden_gem",
      headline: "Hidden gem signal — dig one level deeper",
      body: "Composite reads stronger than the review volume suggests. If specs check out, this can be efficient—but confirm warranty region and seller identity.",
    };
  }

  if (comp >= 78 && trust >= 80 && !susp) {
    return {
      kind: "best_trusted_option",
      headline: "Best trusted lane in this snapshot",
      body: "Top composite aligns with elevated retailer trust and cleaner discount hygiene. Still confirm the exact SKU bundle at checkout—feeds lag reality.",
    };
  }

  if (comp >= 80 && trust >= 72 && !susp) {
    return {
      kind: "buy_now",
      headline: "Buy-ready tray signal — lock checkout hygiene",
      body: "Price, trust, and composite line up for the lead listing. Capture shipping/return screenshots and reconcile tax before you pay.",
    };
  }

  if (comp >= 74 && trust >= 70) {
    return {
      kind: "smart_long_term_buy",
      headline: "Smart long-term buy if support checks out",
      body: "You are not chasing a stunt price—you are buying sustainable value. Verify warranty length and accidental damage policies to lock the win.",
    };
  }

  if (comp < 60 || trust < 62) {
    return {
      kind: "wait",
      headline: "Wait — let the market prove itself",
      body: "Composite or trust is soft versus alternatives. Unless inventory is truly scarce, patience or a different query often buys clarity.",
    };
  }

  return {
    kind: "compare_alternatives",
    headline: "Compare alternatives before you commit",
    body: "No single axis dominates globally—split the call across fulfillment, warranty, and final landed price.",
  };
}

function warnings(products: QuantProduct[], clusters: DealClusterDTO[]): string[] {
  const w: string[] = [];
  if (products.length < 4) w.push("Few listings in this snapshot—breadth is limited for global comparison.");
  if (products.every((p) => p.oldPrice == null)) w.push("No reliable list prices in the feed—discount authenticity is peer-based only.");
  if (!clusters.length) w.push("No multi-store clusters detected—same-SKU matching may be conservative.");
  const low = products.filter((p) => (p.reviewsCount ?? 0) < 8).length;
  if (low >= Math.ceil(products.length * 0.6)) w.push("Thin review depth across most rows—star averages can move quickly.");
  return w;
}

function opportunityCost(query: string, products: QuantProduct[]): string {
  const med = median(products.map((p) => p.price).filter((x) => x > 0));
  const slug = inferProductCategory(query, products.map((p) => p.title).join(" "));
  return `Opportunity cost for “${query.slice(0, 64)}${query.length > 64 ? "…" : ""}” (${slug}): every €${Math.max(15, Math.round(med * 0.08))} saved on the sticker buys risk in returns, shipping slips, or grey-market SKUs—QuantAI weights that trade explicitly.`;
}

function whoBuyAvoid(query: string, products: QuantProduct[], hero: QuantProduct | null): { buy: string; avoid: string } {
  const slug = inferProductCategory(query, products.map((p) => p.title).join(" "));
  const buy = hero
    ? `Buyers who want ${slug} with minimal drama and acceptable delivery friction—especially if ${hero.store}’s return language matches your risk tolerance.`
    : `Buyers who already researched SKU parity and only need a global price sanity check for ${slug}.`;
  const avoid = `Anyone needing guaranteed local warranty, same-day pickup, or invoice-grade procurement without verifying the listing—this tray is informational, not contractual.`;
  return { buy, avoid };
}

function timingNoteFn(products: QuantProduct[], susp: boolean): string {
  if (susp) return "Timing: avoid impulse while markdowns look theatrical—let a second price source confirm anchors.";
  const spread =
    products.map((p) => p.price).filter((x) => x > 0).sort((a, b) => a - b);
  if (spread.length && spread[spread.length - 1]! / Math.max(spread[0]!, 1) > 1.35) {
    return "Timing: wide global spread—promo windows often compress mid-sale; if you are not urgent, revisiting in 48–72h sometimes collapses outliers.";
  }
  return "Timing: tray looks efficient—if you are price-sensitive but not urgent, setting a watch on your top store still costs little.";
}

export function buildSearchIntelligence(
  query: string,
  products: QuantProduct[],
  dealClusters: DealClusterDTO[]
): SearchIntelligenceDTO | null {
  if (!products.length) return null;

  const basketRegionBias = inferBasketRegionBias(products);
  const intel = buildMarketIntel(products, dealClusters);
  const uncertainty = buyerUncertainty(products, dealClusters);
  const tier = confidenceTier(uncertainty);
  const hero = pickGlobalHero(products);
  const cheapRel = pickCheapestReliable(products, 73);
  const mostT = pickMostTrusted(products);
  const local = pickLocalDeal(products, basketRegionBias);

  const final = computeFinal(products, uncertainty, intel);
  const { buy, avoid } = whoBuyAvoid(query, products, hero);

  const prices = products.map((p) => p.price).filter((x) => x > 0);
  const minP = prices.length ? Math.min(...prices) : 0;
  const maxP = prices.length ? Math.max(...prices) : 0;
  const trustMatrix: StoreTrustRow[] = uniqStores(products).map((store) => {
    const pStore = minPriceForStore(products, store);
    const priceFit =
      maxP > minP && pStore > 0 ? Math.max(0, Math.min(1, 1 - (pStore - minP) / (maxP - minP))) : 0.5;
    return {
      store,
      trust: getStoreTrustScore(store),
      tier: getTrustTierLabel(store),
      marketplaceRisk: getMarketplaceSellerRiskTier(store),
      priceFit,
    };
  });
  trustMatrix.sort((a, b) => b.trust - a.trust);

  return {
    query,
    basketRegionBias,
    finalRecommendation: final.kind,
    finalHeadline: final.headline,
    finalBody: final.body,
    buyerUncertaintyScore: uncertainty,
    confidenceTier: tier,
    insufficientDataWarnings: warnings(products, dealClusters),
    opportunityCostNote: opportunityCost(query, products),
    whoShouldBuy: buy,
    whoShouldAvoid: avoid,
    timingNote: timingNoteFn(products, intel.aggressiveFakeDiscount),
    upgradeWorthItNote: upgradeNote(query, products),
    marketIntel: intel,
    globalDeal: hero
      ? { link: hero.link, store: hero.store, title: hero.title }
      : null,
    localDeal: local ? { link: local.link, store: local.store, title: local.title } : null,
    cheapestReliable: cheapRel
      ? { link: cheapRel.link, store: cheapRel.store, title: cheapRel.title }
      : null,
    mostTrustedListing: mostT
      ? { link: mostT.link, store: mostT.store, title: mostT.title }
      : null,
    personaCards: personaCards(query, products, hero, cheapRel),
    trustMatrix,
    priceSpread: {
      min: prices.length ? Math.min(...prices) : 0,
      max: prices.length ? Math.max(...prices) : 0,
      median: median(prices),
    },
  };
}
