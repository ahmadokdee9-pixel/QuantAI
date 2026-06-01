import {
  deliveryConfidencePct,
  currencySymbolFromListing,
  formatListingPrice,
} from "@/lib/commerce/cues";
import {
  buildProductDealIntelligence,
  type ProductDealIntelligence,
} from "@/lib/intelligence/dealIntelligenceEngine";
import type { QuantProduct } from "@/lib/shoppingScore";
import { getFinalComposite, getStoreTrustScore, ratingValue } from "@/lib/shoppingScore";

export type CompareVerdictLabelId =
  | "best_overall"
  | "best_value"
  | "safest_buy"
  | "premium_pick"
  | "avoid_overpriced";

export const COMPARE_VERDICT_LABEL_DISPLAY: Record<CompareVerdictLabelId, string> = {
  best_overall: "Best overall",
  best_value: "Best value",
  safest_buy: "Safest buy",
  premium_pick: "Premium pick",
  avoid_overpriced: "Avoid overpriced option",
};

export type CompareAxisKey =
  | "value_for_money"
  | "trust_level"
  | "retailer_confidence"
  | "price_fairness"
  | "long_term_reliability"
  | "performance_class"
  | "premium_feel"
  | "budget_efficiency"
  | "workload_fit"
  | "shipping_confidence"
  | "fake_discount_risk";

export type CompareAxisInsight = {
  key: CompareAxisKey;
  label: string;
  leaderLink: string;
  leaderTitleShort: string;
  insight: string;
};

export type CompareSmartSignalKind =
  | "overpriced"
  | "weak_value"
  | "suspicious_discount"
  | "premium_without_value"
  | "hidden_value"
  | "retailer_imbalance";

export type CompareSmartSignal = {
  id: string;
  kind: CompareSmartSignalKind;
  severity: "info" | "warn" | "risk";
  title: string;
  body: string;
  productLink?: string;
};

export type CompareVerdictBadge = {
  id: CompareVerdictLabelId;
  pickTitle: string;
  pickLink: string;
  note: string;
};

export type CompareIntelligenceSnapshot = {
  /** 0–100: separation + data density in pinned set vs tray context. */
  comparisonConfidenceScore: number;
  axisInsights: CompareAxisInsight[];
  smartSignals: CompareSmartSignal[];
  verdictBadges: CompareVerdictBadge[];
  primaryVerdictId: CompareVerdictLabelId;
};

function shortTitle(title: string, n: number): string {
  return title.slice(0, n) + (title.length > n ? "…" : "");
}

function reviewDensity01(p: QuantProduct): number {
  const c = p.reviewsCount ?? 0;
  if (c <= 0) return 0.15;
  return Math.min(1, Math.log10(c + 1) / 3.2);
}

function longTermReliability01(p: QuantProduct, list: QuantProduct[]): number {
  const trust = getStoreTrustScore(p.store) / 100;
  const stars = ratingValue(p.rating) / 5;
  const rev = reviewDensity01(p);
  const qi = getFinalComposite(p, list) / 100;
  return Math.min(1, trust * 0.34 + stars * 0.26 + rev * 0.22 + qi * 0.18);
}

function premiumFeel01(p: QuantProduct, list: QuantProduct[]): number {
  const trust = getStoreTrustScore(p.store) / 100;
  const stars = Math.max(0, (ratingValue(p.rating) - 3.8) / 1.2);
  const prices = list.map((x) => x.price).filter((x) => x > 0);
  const med = prices.length ? [...prices].sort((a, b) => a - b)[Math.floor(prices.length / 2)]! : p.price;
  const priceElev = med > 0 ? Math.min(1, p.price / (med * 1.35)) : 0.5;
  return Math.min(1, trust * 0.38 + Math.max(0, stars) * 0.28 + priceElev * 0.34);
}

function budgetEfficiency01(p: QuantProduct, list: QuantProduct[]): number {
  const qi = Math.max(1, getFinalComposite(p, list));
  const price = Math.max(1, p.price);
  const peers = list.filter((x) => x.price > 0).map((x) => Math.max(1, getFinalComposite(x, list)) / x.price);
  const raw = qi / price;
  if (!peers.length) return Math.min(1, raw / 0.08);
  const best = Math.max(...peers, raw);
  return Math.min(1, raw / best);
}

function workloadFitNote(p: QuantProduct): { score: number; insight: string } {
  const t = `${p.title} ${p.qiCategory ?? ""}`.toLowerCase();
  let gaming = 0;
  let prod = 0;
  if (/\b(rtx|gtx|rx\s?\d|gaming|ps5|xbox|144hz|240hz|gpu)\b/i.test(t)) gaming += 0.55;
  if (/\b(macbook|ipad|office|business|ergonomic|mechanical keyboard|webcam|monitor arm)\b/i.test(t)) prod += 0.55;
  if (p.qiCategory === "electronics") {
    gaming += 0.12;
    prod += 0.12;
  }
  const score = Math.min(1, 0.35 + gaming + prod);
  let insight = "Workload signal is neutral from listing text—confirm use case against specs.";
  if (gaming > prod + 0.12) insight = "Listing language skews gaming / performance—validate thermals and panel claims.";
  else if (prod > gaming + 0.12) insight = "Listing language skews productivity / desk work—validate compatibility and warranty.";
  return { score, insight };
}

function fakeDiscountRisk01(p: QuantProduct, intel: ProductDealIntelligence): number {
  const a = p.qiCommerce?.priceAnomaly;
  const disc = p.qiSignals?.discountQuality;
  let r = 0.22;
  if (a === "suspicious_low") r += 0.42;
  if (a === "premium_outlier") r += 0.08;
  if (disc != null) r += (100 - disc) / 220;
  if (intel.suspiciousDiscountRisk >= 62) r += 0.22;
  if (intel.inflatedAnchorSuspected) r += 0.12;
  return Math.min(1, r);
}

function retailerConfidence01(p: QuantProduct): number {
  const risk = p.qiCommerce?.retailerRiskScore ?? 42;
  return Math.min(1, Math.max(0, (92 - risk) / 92));
}

function priceFairness01(p: QuantProduct, list: QuantProduct[], intel: ProductDealIntelligence): number {
  if (intel.overpricedVsTray) return 0.22;
  if (intel.underpricedAnomaly) return 0.88;
  const prices = list.map((x) => x.price).filter((x) => x > 0);
  if (!prices.length || p.price <= 0) return 0.5;
  const med = [...prices].sort((a, b) => a - b)[Math.floor(prices.length / 2)]!;
  const ratio = med > 0 ? p.price / med : 1;
  if (ratio <= 0.92) return 0.86;
  if (ratio <= 1.08) return 0.72;
  if (ratio <= 1.22) return 0.48;
  return 0.28;
}

function buildAxisInsights(
  products: QuantProduct[],
  list: QuantProduct[],
  intelByLink: Map<string, ProductDealIntelligence>
): CompareAxisInsight[] {
  if (products.length < 2) return [];

  const sym = currencySymbolFromListing(products[0]!);

  const vfmRows = products.map((p) => ({
    p,
    score: (p.qiCommerce?.valueForMoney ?? getFinalComposite(p, list) * 0.72 + getStoreTrustScore(p.store) * 0.28) / 100,
  }));
  const trustRows = products.map((p) => ({ p, score: getStoreTrustScore(p.store) / 100 }));
  const retailRows = products.map((p) => ({ p, score: retailerConfidence01(p) }));
  const fairRows = products.map((p) => ({
    p,
    score: priceFairness01(p, list, intelByLink.get(p.link)!),
  }));
  const relRows = products.map((p) => ({ p, score: longTermReliability01(p, list) }));
  const perfRows = products.map((p) => ({ p, score: getFinalComposite(p, list) / 100 }));
  const premRows = products.map((p) => ({ p, score: premiumFeel01(p, list) }));
  const budRows = products.map((p) => ({ p, score: budgetEfficiency01(p, list) }));
  const shipRows = products.map((p) => ({ p, score: deliveryConfidencePct(p) / 100 }));
  const fakeRows = products.map((p) => ({
    p,
    score: fakeDiscountRisk01(p, intelByLink.get(p.link)!),
  }));

  const workloadRows = products.map((p) => {
    const w = workloadFitNote(p);
    return { p, score: w.score, note: w.insight };
  });

  const mk = (
    key: CompareAxisKey,
    label: string,
    rows: { p: QuantProduct; score: number }[],
    explain: (p: QuantProduct, s: number) => string
  ): CompareAxisInsight => {
    const sorted = [...rows].sort((a, b) => b.score - a.score);
    const top = sorted[0]!;
    return { key, label, leaderLink: top.p.link, leaderTitleShort: shortTitle(top.p.title, 44), insight: explain(top.p, top.score) };
  };

  const wTop = [...workloadRows].sort((a, b) => b.score - a.score)[0]!;

  const insights: CompareAxisInsight[] = [
    mk("value_for_money", "Value for money", vfmRows, (p, s) =>
      `Modeled VfM band peaks here (${Math.round(s * 100)}/100 vs peers)—still confirm SKU parity.`.replace(/\s+/g, " ")
    ),
    mk("trust_level", "Trust level", trustRows, (p) => `Storefront prior ${getStoreTrustScore(p.store)}/100 in this tray context.`),
    mk("retailer_confidence", "Retailer confidence", retailRows, (p, s) =>
      `Fulfillment-risk model favors this row (${Math.round(s * 100)}/100) using feed-only cues.`.replace(/\s+/g, " ")
    ),
    mk("price_fairness", "Price fairness", fairRows, (p) => {
      const intel = intelByLink.get(p.link)!;
      if (intel.overpricedVsTray) return `Reads above the tray fair band—needs a spec or bundle justification.`;
      if (intel.underpricedAnomaly) return `Price sits unusually low vs peers—sanity-check seller and warranty.`;
      return `Closest to neutral vs tray median (${formatListingPrice(p.price, sym)}).`;
    }),
    mk("long_term_reliability", "Long-term reliability", relRows, (p, s) =>
      `Blends trust, review depth, and stars (${Math.round(s * 100)}/100 synthetic index).`.replace(/\s+/g, " ")
    ),
    mk("performance_class", "Performance class", perfRows, (p) => `QI composite ${getFinalComposite(p, list)}/100 within your pinned set.`),
    mk("premium_feel", "Premium feel", premRows, () => `Weighted to calm seller story + elevated ask without collapsing stars.`),
    mk("budget_efficiency", "Budget efficiency", budRows, () => `Strongest composite-per-euro posture in this compare lane.`),
    {
      key: "workload_fit",
      label: "Gaming / productivity fit",
      leaderLink: wTop.p.link,
      leaderTitleShort: shortTitle(wTop.p.title, 44),
      insight: wTop.note,
    },
    mk("shipping_confidence", "Shipping confidence", shipRows, (p) => {
      const d = deliveryConfidencePct(p);
      return `Delivery confidence heuristic ${d}/100${p.shipping ? " — listing mentions shipping." : " — shipping text thin."}`;
    }),
    (() => {
      const safestDisc = [...fakeRows].sort((a, b) => a.score - b.score)[0]!;
      const hygiene = Math.round((1 - Math.min(1, safestDisc.score)) * 100);
      return {
        key: "fake_discount_risk" as const,
        label: "Fake discount risk",
        leaderLink: safestDisc.p.link,
        leaderTitleShort: shortTitle(safestDisc.p.title, 44),
        insight: `Cleanest markdown hygiene in the pin set (${hygiene}/100)—others need sharper list-price verification.`,
      };
    })(),
  ];

  return insights;
}

function buildSmartSignals(
  products: QuantProduct[],
  list: QuantProduct[],
  intelByLink: Map<string, ProductDealIntelligence>
): CompareSmartSignal[] {
  if (products.length < 2) return [];
  const out: CompareSmartSignal[] = [];
  const trusts = products.map((p) => getStoreTrustScore(p.store));
  const tMax = Math.max(...trusts);
  const tMin = Math.min(...trusts);
  if (tMax - tMin >= 18) {
    const weak = products.find((p) => getStoreTrustScore(p.store) === tMin);
    if (weak) {
      out.push({
        id: "retail-imbalance",
        kind: "retailer_imbalance",
        severity: "warn",
        title: "Retailer trust imbalance",
        body: `${shortTitle(weak.title, 48)} carries a materially lower storefront prior (${tMin} vs ${tMax})—read policies before you optimize on price alone.`,
        productLink: weak.link,
      });
    }
  }

  for (const p of products) {
    const intel = intelByLink.get(p.link)!;
    const qi = getFinalComposite(p, list);
    const bestQi = Math.max(...products.map((x) => getFinalComposite(x, list)));
    if (intel.overpricedVsTray && qi < bestQi - 6) {
      out.push({
        id: `over-${p.link.slice(-24)}`,
        kind: "overpriced",
        severity: "risk",
        title: "Overpriced vs tray",
        body: `${shortTitle(p.title, 44)} is flagged above fair band while trailing composite—negotiate alternatives or downgrade SKU tier.`,
        productLink: p.link,
      });
    }
    if (intel.overpricedVsTray && getStoreTrustScore(p.store) >= 78 && qi < bestQi - 3) {
      out.push({
        id: `prem-${p.link.slice(-24)}`,
        kind: "premium_without_value",
        severity: "info",
        title: "Premium shelf without composite lead",
        body: `${shortTitle(p.title, 44)} is a polished storefront with a softer composite read—paying for certainty, not raw score.`,
        productLink: p.link,
      });
    }
    if (intel.underpricedAnomaly && qi >= bestQi - 10) {
      out.push({
        id: `hidden-${p.link.slice(-24)}`,
        kind: "hidden_value",
        severity: "info",
        title: "Strong value signal",
        body: `${shortTitle(p.title, 44)} prices below peer band while keeping composite respectable—verify warranty and seller identity.`,
        productLink: p.link,
      });
    }
    if (p.qiCommerce?.priceAnomaly === "suspicious_low" || intel.suspiciousDiscountRisk >= 64) {
      out.push({
        id: `disc-${p.link.slice(-24)}`,
        kind: "suspicious_discount",
        severity: "warn",
        title: "Suspicious discount shape",
        body: `${shortTitle(p.title, 44)} shows markdown cues that do not reconcile cleanly with trust—confirm list price on the store page.`,
        productLink: p.link,
      });
    }
    const vfm = p.qiCommerce?.valueForMoney ?? 50;
    if (vfm < 42 && qi < bestQi - 12) {
      out.push({
        id: `weak-${p.link.slice(-24)}`,
        kind: "weak_value",
        severity: "warn",
        title: "Weak value listing",
        body: `${shortTitle(p.title, 44)} pairs a softer VfM read with a trailing composite—better as a benchmark than a checkout default.`,
        productLink: p.link,
      });
    }
  }

  const dedup = new Map<string, CompareSmartSignal>();
  for (const s of out) {
    if (!dedup.has(s.id)) dedup.set(s.id, s);
  }
  return [...dedup.values()].slice(0, 8);
}

function buildVerdictBadges(
  products: QuantProduct[],
  list: QuantProduct[],
  intelByLink: Map<string, ProductDealIntelligence>
): {
  badges: CompareVerdictBadge[];
  primary: CompareVerdictLabelId;
} {
  if (products.length === 0) return { badges: [], primary: "best_overall" };
  const scored = products.map((p) => ({
    p,
    qi: getFinalComposite(p, list),
    trust: getStoreTrustScore(p.store),
    vfm: p.qiCommerce?.valueForMoney ?? 50,
    intel: intelByLink.get(p.link)!,
  }));
  const byQi = [...scored].sort((a, b) => b.qi - a.qi);
  const byTrust = [...scored].sort((a, b) => b.trust - a.trust);
  const byVfm = [...scored].sort((a, b) => b.vfm - a.vfm);
  const byPremium = [...scored].sort(
    (a, b) => b.trust * Math.log(1 + b.p.price) - a.trust * Math.log(1 + a.p.price)
  );

  const overall = byQi[0]!;
  const badges: CompareVerdictBadge[] = [];

  badges.push({
    id: "best_overall",
    pickTitle: shortTitle(overall.p.title, 56),
    pickLink: overall.p.link,
    note: `QI ${overall.qi}/100 leads your pin set on composite.`,
  });

  const valueLead = byVfm[0]!;
  if (valueLead.p.link !== overall.p.link) {
    badges.push({
      id: "best_value",
      pickTitle: shortTitle(valueLead.p.title, 56),
      pickLink: valueLead.p.link,
      note: "Strongest modeled value-for-money versus the other finalists.",
    });
  }

  const safe = byTrust[0]!;
  if (safe.p.link !== overall.p.link && safe.qi >= byQi[0]!.qi - 9) {
    badges.push({
      id: "safest_buy",
      pickTitle: shortTitle(safe.p.title, 56),
      pickLink: safe.p.link,
      note: `Trust prior ${safe.trust}/100 with composite still within striking distance.`,
    });
  }

  const prem = byPremium[0]!;
  if (
    prem.p.link !== overall.p.link &&
    prem.trust >= 76 &&
    ratingValue(prem.p.rating) >= 4.15 &&
    prem.p.price >= median(products.map((x) => x.price).filter((x) => x > 0)) * 0.95
  ) {
    badges.push({
      id: "premium_pick",
      pickTitle: shortTitle(prem.p.title, 56),
      pickLink: prem.p.link,
      note: "Elevated ask with a calmer seller story—use when finish and support matter more than raw score.",
    });
  }

  const avoid = scored.find((s) => s.intel.overpricedVsTray && s.qi <= byQi[0]!.qi - 8);
  if (avoid) {
    badges.push({
      id: "avoid_overpriced",
      pickTitle: shortTitle(avoid.p.title, 56),
      pickLink: avoid.p.link,
      note: "Reads rich versus the tray while lagging composite—park unless bundle or spec gap explains it.",
    });
  }

  let primary: CompareVerdictLabelId = "best_overall";
  if (avoid && avoid.p.link === overall.p.link) {
    const alt = byTrust[0]!;
    if (alt.p.link !== overall.p.link) primary = "safest_buy";
    else primary = "best_value";
  }

  return { badges: badges.slice(0, 5), primary };
}

function median(nums: number[]): number {
  const s = nums.filter((n) => n > 0).sort((a, b) => a - b);
  if (!s.length) return 0;
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
}

function confidenceScore(products: QuantProduct[], list: QuantProduct[]): number {
  if (products.length < 2) return 0;
  const qis = products.map((p) => getFinalComposite(p, list));
  const spread = Math.max(...qis) - Math.min(...qis);
  const reviewBoost = products.every((p) => (p.reviewsCount ?? 0) >= 12) ? 8 : 0;
  const dataPenalty = products.some((p) => !p.qiCommerce) ? 10 : 0;
  const trayN = list.length;
  const trayBoost = Math.min(12, Math.floor(trayN / 6));
  let base = 46 + Math.min(38, spread * 2.1) + reviewBoost + trayBoost - dataPenalty;
  if (products.length >= 3) base += 6;
  const trustSpread =
    Math.max(...products.map((p) => getStoreTrustScore(p.store))) -
    Math.min(...products.map((p) => getStoreTrustScore(p.store)));
  if (trustSpread > 22) base -= 5;
  return Math.min(94, Math.max(38, Math.round(base)));
}

/** Tray-aware compare intelligence for UI + optional server merge. */
export function buildCompareIntelligenceSnapshot(
  products: QuantProduct[],
  tray: QuantProduct[]
): CompareIntelligenceSnapshot {
  const list = tray.length >= products.length ? tray : products;
  if (products.length < 2) {
    return {
      comparisonConfidenceScore: 0,
      axisInsights: [],
      smartSignals: [],
      verdictBadges: [],
      primaryVerdictId: "best_overall",
    };
  }

  const intelByLink = new Map(
    products.map((p) => [p.link, buildProductDealIntelligence(p, list)] as const)
  );

  const axisInsights = buildAxisInsights(products, list, intelByLink);
  const smartSignals = buildSmartSignals(products, list, intelByLink);
  const { badges, primary } = buildVerdictBadges(products, list, intelByLink);
  return {
    comparisonConfidenceScore: confidenceScore(products, list),
    axisInsights,
    smartSignals,
    verdictBadges: badges,
    primaryVerdictId: primary,
  };
}
