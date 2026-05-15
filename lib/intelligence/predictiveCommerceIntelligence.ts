/**
 * Predictive commerce intelligence — tray-local heuristics (no historical price APIs).
 * Future-facing timing, manipulation/stock probabilities, and bounded ranking deltas.
 */

import { fakeDiscountRisk } from "@/lib/deals/dealAnalysis";
import { listingSignalsRefurbished } from "@/lib/commerce/listingQuality";
import type { QuantProduct } from "@/lib/shoppingScore";
import { getFinalComposite, getStoreTrustScore } from "@/lib/shoppingScore";
import { getMarketplaceSellerRiskTier } from "@/lib/retailTrust";
import type { CommerceSearchIntents } from "./searchIntentV2";
import type { ProductCategorySlug } from "./types";
import type {
  PredictivePriceOutlook,
  PredictiveTimingVerdict,
  QiPredictiveCommerce,
} from "./commerceAnalysisTypes";

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function clamp01(x: number): number {
  return clamp(x, 0, 1);
}

function median(nums: number[]): number {
  const s = [...nums].sort((a, b) => a - b);
  if (!s.length) return 0;
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
}

function discountPct(p: QuantProduct): number | null {
  if (p.oldPrice == null || p.oldPrice <= p.price || p.price <= 0) return null;
  return Math.round(((p.oldPrice - p.price) / p.oldPrice) * 100);
}

function trayPriceVolatility01(list: QuantProduct[]): number {
  const prices = list.map((p) => p.price).filter((n) => n > 0);
  if (prices.length < 3) return 0.22;
  const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
  const v = prices.reduce((a, x) => a + (x - mean) ** 2, 0) / Math.max(1, prices.length - 1);
  const cv = mean > 0 ? Math.sqrt(v) / mean : 0;
  return clamp01(cv / 0.32);
}

function peerMedianExcluding(list: QuantProduct[], link: string): number {
  const prices = list.filter((x) => x.link !== link && x.price > 0).map((x) => x.price);
  return median(prices);
}

function stockPressure01(p: QuantProduct): number {
  const blob = `${p.availability ?? ""} ${p.extensions.join(" ")}`.toLowerCase();
  let s = 0;
  if (/limited|low stock|only \d|few left|almost gone|hurry|ends (today|soon)/i.test(blob)) s += 0.55;
  if (/last|selling fast|while supplies/i.test(blob)) s += 0.28;
  if (p.reviewsCount != null && p.reviewsCount < 8 && p.price > 0) s += 0.08;
  return clamp01(s);
}

function categoryPredictiveLens(
  cat: ProductCategorySlug,
  query: string,
  intents: CommerceSearchIntents
): string {
  const q = query.toLowerCase();
  if (/\b(gift|present|birthday|valentine|mother|father)\b/i.test(q) || intents.giftUse) {
    return "Gifts: urgency and emotional fit weigh heavier than marginal price cuts—verify authenticity on luxury adjacency.";
  }
  switch (cat) {
    case "electronics":
      return "Electronics: model-year decay and refurbished lanes often widen the gap between “cheap” and “safe” within days.";
    case "beauty":
      return "Beauty/perfume: headline anchors move more than hardware—discount authenticity and seller trust dominate regret risk.";
    case "fashion":
      return "Fashion: size/stock churn and seasonal markdown cadence mean the best trusted row sometimes appears after a short watch window.";
    case "home":
      return "Furniture/home: delivery and damage-risk language matters; inflated strikethroughs are common—peer median beats anchor drama.";
    default:
      return "Category-neutral read: trust, peer spread, and discount hygiene forecast near-term regret more than a single list price.";
  }
}

function outlookFromSignals(args: {
  fake: "low" | "medium" | "high";
  vol01: number;
  priceVsPeer: number;
  priceTrend: QuantProduct["priceTrend"];
  trust: number;
  anomaly?: string;
}): PredictivePriceOutlook {
  const { fake, vol01, priceVsPeer, priceTrend, trust, anomaly } = args;
  if (fake === "high" || anomaly === "suspicious_low") return "fake_discount_heavy";
  if (priceTrend === "up" && priceVsPeer > 1.06) return "likely_rise";
  if (vol01 >= 0.55 && priceVsPeer > 1.05 && trust >= 58) return "likely_drop";
  if (vol01 >= 0.42 && priceVsPeer >= 0.92 && fake === "low") return "likely_drop";
  if (priceVsPeer < 0.9 && (fake === "low" || fake === "medium")) return "stable";
  if (trust < 52 || fake === "medium") return "uncertain";
  return "stable";
}

function timingFromScores(args: {
  outlook: PredictivePriceOutlook;
  fake: "low" | "medium" | "high";
  trust: number;
  priceVsPeer: number;
  vol01: number;
  stock01: number;
  manipulation01: number;
  betterDeal01: number;
  category: ProductCategorySlug;
  refurb: boolean;
  giftUrgency: boolean;
}): { verdict: PredictiveTimingVerdict; label: string; narrative: string } {
  const {
    outlook,
    fake,
    trust,
    priceVsPeer,
    vol01,
    stock01,
    manipulation01,
    betterDeal01,
    category,
    refurb,
    giftUrgency,
  } = args;

  if (fake === "high" || outlook === "fake_discount_heavy" || manipulation01 >= 0.62) {
    return {
      verdict: "avoid_fake_discount",
      label: "Avoid fake discount",
      narrative:
        "Avoid this markdown story for now—the anchor vs peers reads promotional and manipulation risk is elevated in this snapshot.",
    };
  }
  if (refurb && category === "electronics" && trust < 70) {
    return {
      verdict: "wait_real_discount",
      label: "Wait for real discount",
      narrative:
        "Wait for a cleaner electronics lane—refurb/open-box copy plus softer trust means the headline price can improve on safer sellers.",
    };
  }
  if (giftUrgency && trust >= 68 && stock01 >= 0.45) {
    return {
      verdict: "stock_risk_buy",
      label: "Stock-risk buy",
      narrative:
        "Buy now if you truly need it—gift-urgency plus stock hints suggest rotation before a calmer compare window opens.",
    };
  }
  if (stock01 >= 0.55 && trust >= 62 && priceVsPeer <= 1.05) {
    return {
      verdict: "stock_risk_buy",
      label: "Stock-risk buy",
      narrative:
        "Buy now if the SKU is right—stock/read signals imply this row may leave before a better trusted alternative appears.",
    };
  }
  if (trust >= 72 && fake === "low" && priceVsPeer <= 0.94 && manipulation01 < 0.38) {
    return {
      verdict: "buy_now",
      label: "Buy now",
      narrative:
        "Buy now because price already sits below the trusted peer band and discount hygiene looks honest in this tray.",
    };
  }
  if (trust >= 66 && priceVsPeer <= 1.02 && priceVsPeer >= 0.88 && fake === "low" && manipulation01 < 0.45) {
    return {
      verdict: "price_fair",
      label: "Price already fair",
      narrative:
        "Price already looks fair vs the trusted median—future gains are more about convenience than a big markdown swing.",
    };
  }
  if (fake === "medium" || manipulation01 >= 0.48) {
    return {
      verdict: "wait_real_discount",
      label: "Wait for real discount",
      narrative:
        "Wait because seller trust is weaker and similar items rotate often—patience usually surfaces a cleaner markdown or seller.",
    };
  }
  if (vol01 >= 0.48 && betterDeal01 >= 0.42) {
    return {
      verdict: "watch_7d",
      label: "Watch ~7 days",
      narrative:
        "Watch ~7 days because this category shows frequent weekly repricing in comparable trays—no need to chase a noisy anchor today.",
    };
  }
  if (outlook === "likely_drop" && betterDeal01 >= 0.5) {
    return {
      verdict: "watch_7d",
      label: "Watch ~7 days",
      narrative:
        "Watch briefly: volatility and peer spread suggest a better-trusted or cheaper row may surface without waiting months.",
    };
  }
  return {
    verdict: "wait_real_discount",
    label: "Wait for real discount",
    narrative:
      "Wait for a real discount signal—composite is fine but the next week of listing churn often improves the risk/reward balance here.",
  };
}

function rankDeltaForPredictive(args: {
  verdict: PredictiveTimingVerdict;
  outlook: PredictivePriceOutlook;
  manipulation01: number;
  betterDeal01: number;
  fake: "low" | "medium" | "high";
  trust: number;
}): number {
  let d = 0;
  if (args.verdict === "buy_now") d += 3;
  if (args.verdict === "price_fair") d += 2;
  if (args.verdict === "stock_risk_buy") d += 1;
  if (args.verdict === "avoid_fake_discount") d -= 5;
  if (args.verdict === "wait_real_discount") d -= 2;
  if (args.verdict === "watch_7d") d -= 1;
  if (args.outlook === "likely_drop" && args.betterDeal01 >= 0.55) d -= 1;
  if (args.manipulation01 >= 0.55) d -= 2;
  if (args.fake === "high") d -= 2;
  if (args.fake === "medium") d -= 1;
  if (args.trust >= 78 && args.fake === "low") d += 1;
  return clamp(Math.round(d), -6, 6);
}

function verdictLabelToAdaptiveVerdict(verdict: PredictiveTimingVerdict): string {
  switch (verdict) {
    case "buy_now":
      return "Buy now — predictive window favors execution.";
    case "stock_risk_buy":
      return "Stock-risk buy — execute if the SKU is right.";
    case "price_fair":
      return "Price already fair vs trusted peers.";
    case "watch_7d":
      return "Watch ~7 days — repricing cadence likely.";
    case "wait_real_discount":
      return "Wait for real discount — patience favored.";
    case "avoid_fake_discount":
      return "Avoid fake discount — anchor hygiene fails.";
    default:
      return "Compare alternatives — predictive read mixed.";
  }
}

function shouldOverrideQiVerdict(verdict: PredictiveTimingVerdict, manipulation01: number, fake: string): boolean {
  if (verdict === "avoid_fake_discount") return true;
  if (verdict === "buy_now" && manipulation01 < 0.4 && fake === "low") return true;
  if (verdict === "stock_risk_buy") return true;
  return false;
}

export function computeQiPredictiveCommerce(
  p: QuantProduct,
  list: QuantProduct[],
  query: string,
  intents: CommerceSearchIntents
): QiPredictiveCommerce {
  const cat = (p.qiCategory ?? "general") as ProductCategorySlug;
  const trust = getStoreTrustScore(p.store);
  const maxReviews = Math.max(...list.map((x) => x.reviewsCount ?? 0), 1);
  const disc = discountPct(p);
  const fake = fakeDiscountRisk(p, list, disc, maxReviews);
  const peerMed = peerMedianExcluding(list, p.link);
  const priceVsPeer = peerMed > 0 && p.price > 0 ? p.price / peerMed : 1;
  const vol01 = trayPriceVolatility01(list);
  const stock01 = stockPressure01(p);
  const mkt = getMarketplaceSellerRiskTier(p.store, p.title);
  const refurb = listingSignalsRefurbished(p);
  const giftUrgency = /\b(gift|present|birthday|valentine)\b/i.test(query) || intents.giftUse;

  const anchorDrama =
    disc != null &&
    disc > 38 &&
    (p.qiCommerce?.priceAnomaly === "deep_discount" || p.qiCommerce?.priceAnomaly === "suspicious_low");
  const trustSpread =
    list.length >= 4
      ? Math.max(...list.map((x) => getStoreTrustScore(x.store))) - trust
      : 0;

  const manipulation01 = clamp01(
    (fake === "high" ? 0.55 : fake === "medium" ? 0.32 : 0.12) +
      (anchorDrama ? 0.22 : 0) +
      (mkt === "high" ? 0.18 : mkt === "medium" ? 0.08 : 0) +
      (p.qiCommerce?.priceAnomaly === "suspicious_low" ? 0.2 : 0)
  );
  const betterDeal01 = clamp01(
    vol01 * 0.45 +
      (priceVsPeer > 1.06 ? 0.22 : 0) +
      (trustSpread > 18 ? 0.18 : 0) +
      (fake !== "low" ? 0.12 : 0)
  );
  const stockDisappear01 = clamp01(stock01 * 0.85 + (vol01 > 0.5 ? 0.12 : 0));
  const betterTrustedSeller01 = clamp01(
    (trustSpread > 14 ? 0.35 : 0.1) + (list.filter((x) => getStoreTrustScore(x.store) >= 78).length >= 2 ? 0.25 : 0)
  );

  const outlook = outlookFromSignals({
    fake,
    vol01,
    priceVsPeer,
    priceTrend: p.priceTrend,
    trust,
    anomaly: p.qiCommerce?.priceAnomaly,
  });

  const { verdict, label, narrative } = timingFromScores({
    outlook,
    fake,
    trust,
    priceVsPeer,
    vol01,
    stock01,
    manipulation01,
    betterDeal01,
    category: cat,
    refurb,
    giftUrgency,
  });

  const lens = categoryPredictiveLens(cat, query, intents);
  const narrativeFull =
    `${narrative} ${lens}`.replace(/\s+/g, " ").trim().slice(0, 520);

  return {
    version: 1,
    priceOutlook: outlook,
    timingVerdict: verdict,
    timingVerdictLabel: label,
    narrative: narrativeFull,
    probabilities: {
      betterDealLater01: Number(betterDeal01.toFixed(3)),
      priceManipulation01: Number(manipulation01.toFixed(3)),
      stockDisappearance01: Number(stockDisappear01.toFixed(3)),
      betterTrustedSeller01: Number(betterTrustedSeller01.toFixed(3)),
    },
    categoryLens: lens.slice(0, 240),
  };
}

/** Apply predictive layer + bounded composite shift (call post-cache, before persona if desired). */
export function applyPredictiveCommerceToTray(
  products: QuantProduct[],
  query: string,
  intents: CommerceSearchIntents
): QuantProduct[] {
  if (products.length === 0) return products;
  const out = products.map((p) => {
    const pred = computeQiPredictiveCommerce(p, products, query, intents);
    const fake = fakeDiscountRisk(p, products, discountPct(p), Math.max(...products.map((x) => x.reviewsCount ?? 0), 1));
    const manipulation01 = pred.probabilities.priceManipulation01;
    const betterDeal01 = pred.probabilities.betterDealLater01;
    const trust = getStoreTrustScore(p.store);
    const d = rankDeltaForPredictive({
      verdict: pred.timingVerdict,
      outlook: pred.priceOutlook,
      manipulation01,
      betterDeal01,
      fake,
      trust,
    });
    const base = getFinalComposite(p, products);
    const qiComposite = clamp(base + d, 0, 100);
    let qiReason = (p.qiReason ?? "").trim();
    const tail = `Predictive: ${pred.timingVerdictLabel} — ${pred.narrative.slice(0, 280)}`.trim();
    qiReason = `${qiReason} ${tail}`.trim().slice(0, 1700);

    let qiVerdict = p.qiVerdict;
    if (shouldOverrideQiVerdict(pred.timingVerdict, manipulation01, fake)) {
      qiVerdict = verdictLabelToAdaptiveVerdict(pred.timingVerdict);
    } else if (
      pred.timingVerdict === "watch_7d" ||
      pred.timingVerdict === "wait_real_discount" ||
      pred.timingVerdict === "price_fair"
    ) {
      const weak = !p.qiVerdict || /wait for better pricing|watch for a better entry|peers lean cheaper/i.test(p.qiVerdict);
      if (weak) qiVerdict = verdictLabelToAdaptiveVerdict(pred.timingVerdict);
    }

    return {
      ...p,
      qiComposite,
      qiReason,
      qiVerdict,
      qiPredictive: pred,
    };
  });
  return [...out].sort((a, b) => (b.qiComposite ?? 0) - (a.qiComposite ?? 0));
}
