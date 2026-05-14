import type {
  CommerceRiskFlag,
  ProductCommerceAI,
} from "@/lib/intelligence/commerceAnalysisTypes";
import { inferBuyerPersonasFromQuery, personaGuidanceLine } from "@/lib/intelligence/commerceIntel/buyerPersona";
import { buildCategoryLensBullets, categorySlugForProduct } from "@/lib/intelligence/commerceIntel/categoryDeepIntel";
import { buildPriceFieldIntel } from "@/lib/intelligence/commerceIntel/fieldPriceIntel";
import { buildRetailerRiskIntel } from "@/lib/intelligence/commerceIntel/retailerRiskIntel";
import { buildSignalConfidence } from "@/lib/intelligence/commerceIntel/signalConfidence";
import { getStoreTrustScore } from "@/lib/retailTrust";
import type { QuantProduct } from "@/lib/shoppingScore";
import { ratingValue } from "@/lib/shoppingScore";

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function risksFromProduct(p: QuantProduct, list: QuantProduct[]): CommerceRiskFlag[] {
  const out: CommerceRiskFlag[] = [];
  const sig = p.qiSignals;
  const rating = ratingValue(p.rating);
  const trust = getStoreTrustScore(p.store);

  if (p.priceTrend === "down" && (sig?.discountQuality ?? 50) < 42) {
    out.push({
      code: "DISCOUNT_SIGNAL",
      severity: "medium",
      label: "Promo or list-price gap looks aggressive — confirm the real street price.",
    });
  }
  if ((p.reviewsCount ?? 0) < 12 && rating > 0) {
    out.push({
      code: "THIN_REVIEWS",
      severity: "medium",
      label: "Few reviews visible — score may not be battle-tested yet.",
    });
  }
  if (trust < 58) {
    out.push({
      code: "RETAILER_VARIANCE",
      severity: trust < 45 ? "high" : "low",
      label: "Less familiar storefront — double-check seller identity and buyer protection.",
    });
  }
  if (rating > 0 && rating < 3.9) {
    out.push({
      code: "WEAK_RATING",
      severity: "high",
      label: "User rating is soft versus typical picks in this tray.",
    });
  }
  const maxR = Math.max(1, ...list.map((x) => x.reviewsCount ?? 0));
  if ((p.reviewsCount ?? 0) > 0 && (p.reviewsCount ?? 0) < maxR * 0.08 && maxR > 80) {
    out.push({
      code: "REVIEW_DEPTH_GAP",
      severity: "low",
      label: "Review volume trails the most-reviewed alternative in this result set.",
    });
  }
  return out.slice(0, 5);
}

function valueForMoneyFromSignals(
  p: QuantProduct,
  priceIntel: ReturnType<typeof buildPriceFieldIntel>,
  risk: ReturnType<typeof buildRetailerRiskIntel>
): number {
  const sig = p.qiSignals;
  let v =
    48 +
    (sig?.pricePerformance ?? 50) * 0.2 +
    (sig?.discountQuality ?? 50) * 0.16 +
    (sig?.priceFit ?? 50) * 0.18 +
    (sig?.retailerTrust ?? 50) * 0.14 +
    (sig?.rating ?? 50) * 0.14 +
    (sig?.reviewDepth ?? 50) * 0.1;

  if (priceIntel.percentile <= 18) v += 8;
  if (priceIntel.percentile >= 85) v -= 6;
  if (priceIntel.anomaly === "suspicious_low") v -= 22;
  if (priceIntel.anomaly === "deep_discount") v -= 6;
  if (risk.riskScore >= 72) v -= 12;
  if (risk.riskScore <= 28) v += 4;

  return clamp(Math.round(v), 0, 100);
}

function composeBuyingVerdict(
  p: QuantProduct,
  query: string,
  list: QuantProduct[],
  priceIntel: ReturnType<typeof buildPriceFieldIntel>,
  risk: ReturnType<typeof buildRetailerRiskIntel>,
  personas: ReturnType<typeof inferBuyerPersonasFromQuery>
): string {
  const qc = Math.round(p.qiComposite ?? 0);
  const rt = getStoreTrustScore(p.store);
  const rv = ratingValue(p.rating);
  const parts: string[] = [];

  if (priceIntel.anomaly === "suspicious_low") {
    parts.push(
      "Price sits unusually low versus tray peers—could be a sharp deal or a thin-seller / mismatch risk; verify SKU and seller."
    );
  } else if (priceIntel.anomaly === "deep_discount") {
    parts.push("Aggressive discount versus the tray median—worth validating list-price history and warranty terms.");
  } else if (priceIntel.anomaly === "premium_outlier") {
    parts.push("Priced toward the top of this tray—often justified by spec tier, bundle, or brand tax; confirm what you are paying for.");
  }

  if (rv >= 4.5 && (p.reviewsCount ?? 0) >= 40) {
    parts.push("High review volume improves confidence in the visible rating signal.");
  } else if ((p.reviewsCount ?? 0) < 15 && rv > 0) {
    parts.push("Review depth is thin—treat stars as directional until you read qualitative feedback.");
  }

  if (qc >= 74) {
    parts.push(
      `Strong QuantAI composite (${qc}/100) for this query—${priceIntel.oneLiner}`.replace(/\s+/g, " ").trim()
    );
  } else if (qc >= 58) {
    parts.push(
      `Balanced composite (${qc}/100) with ${rt >= 68 ? "solid" : "mixed"} retailer trust (${rt}/100 heuristic prior).`
    );
  } else {
    parts.push(
      `Composite (${qc}/100) trails leaders here—only compelling if price niche or spec rarity justifies the tradeoffs.`
    );
  }

  if (risk.riskScore >= 62) {
    parts.push(`Retailer-risk read is elevated (${risk.riskScore}/100 feed heuristic)—${risk.flags[0] ?? "verify seller and returns."}`);
  } else if (rt >= 78) {
    parts.push("Retailer trust prior is comparatively strong for this tray—checkout friction should be lower if specs match.");
  }

  parts.push(personaGuidanceLine(personas));

  const base = (p.qiVerdict ?? "").trim();
  if (base.length > 24 && !parts.some((x) => x.includes(base.slice(0, 20)))) {
    parts.push(base.slice(0, 140));
  }

  return parts.join(" ").replace(/\s+/g, " ").trim().slice(0, 380);
}

export function heuristicCommerceForProduct(
  p: QuantProduct,
  query: string,
  list: QuantProduct[]
): ProductCommerceAI {
  const slug = categorySlugForProduct(query, p.title);
  const { bullets: categoryLens } = buildCategoryLensBullets(query, p.title, slug);
  const priceIntel = buildPriceFieldIntel(p, list);
  const risk = buildRetailerRiskIntel(p, list);
  const personas = inferBuyerPersonasFromQuery(query);
  const conf = buildSignalConfidence(p, list);

  const buyingVerdict = composeBuyingVerdict(p, query, list, priceIntel, risk, personas);

  const pros: string[] = [];
  const cons: string[] = [];

  if ((p.qiComposite ?? 0) >= 72) pros.push("Composite clears most peers in this live tray.");
  else if ((p.qiComposite ?? 0) >= 58) pros.push("Balanced signal stack—viable if logistics and specs line up.");

  if (getStoreTrustScore(p.store) >= 76) pros.push(`Store trust prior is high for a shopping feed (${getStoreTrustScore(p.store)}/100).`);
  if (ratingValue(p.rating) >= 4.5) pros.push("Visible rating is healthy versus typical listings.");
  if (priceIntel.percentile <= 22 && priceIntel.anomaly !== "suspicious_low") {
    pros.push("Sits near the cheapest trusted band in this tray—good relative value if quality checks out.");
  }

  pros.push(priceIntel.oneLiner);
  if (categoryLens[0]) pros.push(categoryLens[0]!);

  if ((p.qiComposite ?? 0) < 54) cons.push("Composite lags top picks—need a clear reason (price, spec, availability) to choose this row.");
  if (getStoreTrustScore(p.store) < 62) cons.push("Store signal is thinner—read dispute and return paths before paying.");
  if ((p.reviewsCount ?? 0) < 20) cons.push("Limited public review depth in the feed snapshot.");
  if (priceIntel.anomaly === "suspicious_low") {
    cons.push("Price anomaly vs peers—extra verification recommended before treating as a safe deal.");
  }
  if (risk.riskScore >= 58) cons.push(risk.flags[0] ?? "Elevated marketplace risk heuristics on this row.");

  const reason = (p.qiReason ?? "").trim();
  if (reason.length > 20) pros.push(reason.slice(0, 200));

  const ship = (p.shipping ?? "").trim();
  const deliveryIntel =
    ship.length > 2 ? ship.slice(0, 180) : "No explicit delivery line in feed — confirm at checkout.";

  const returnsIntel =
    "Return policy not in shopping feed — check retailer policy and restocking fees before purchase.";

  const comparedToFieldNote = priceIntel.oneLiner.slice(0, 200);

  const q = query.trim().toLowerCase();
  const title = p.title.toLowerCase();
  const semanticVsQuery =
    q.length > 2 && title.includes(q.slice(0, Math.min(24, q.length)))
      ? "Listing title lines up closely with what you typed."
      : (p.qiSignals?.categoryFit ?? 50) >= 62
        ? "Category fit looks reasonable for your search."
        : "Match is uncertain—glance at specs against what you really need.";

  return {
    buyingVerdict,
    pros: pros.filter(Boolean).slice(0, 4).map((s) => s.slice(0, 200)),
    cons: cons.filter(Boolean).slice(0, 4).map((s) => s.slice(0, 200)),
    risks: risksFromProduct(p, list),
    valueForMoney: valueForMoneyFromSignals(p, priceIntel, risk),
    confidence: conf.score,
    confidenceExplanation: conf.explanation,
    signalGaps: conf.gaps.length ? conf.gaps : undefined,
    needsManualVerification: conf.needsManualVerification,
    retailerRiskScore: risk.riskScore,
    retailerRiskNote: risk.note,
    pricePercentile: priceIntel.percentile,
    priceFieldNote: comparedToFieldNote,
    priceAnomaly: priceIntel.anomaly,
    categoryLens: categoryLens.slice(0, 3),
    inferredPersonas: personas.slice(),
    deliveryIntel,
    returnsIntel,
    trustWeightedNote: `Store trust ${getStoreTrustScore(p.store)}/100 · retailer risk ${risk.riskScore}/100 · overall score ${Math.round(p.qiComposite ?? 0)}.`.slice(
      0,
      200
    ),
    semanticVsQuery: semanticVsQuery.slice(0, 200),
    comparedToFieldNote: comparedToFieldNote.slice(0, 200),
    modelId: "heuristic-v2",
    source: "heuristic",
  };
}

export function heuristicFieldComparisonSummary(list: QuantProduct[], query: string): string {
  if (!list.length) return "";
  const prices = list.map((p) => p.price).filter((p) => p > 0);
  const minP = prices.length ? Math.min(...prices) : 0;
  const maxP = prices.length ? Math.max(...prices) : 0;
  const bestTrust = [...list].sort((a, b) => getStoreTrustScore(b.store) - getStoreTrustScore(a.store))[0];
  const n = list.length;
  const med = [...prices].sort((a, b) => a - b);
  const mid = med.length ? med[Math.floor(med.length / 2)]! : 0;
  return `Tray (${n}) · “${query.slice(0, 72)}${query.length > 72 ? "…" : ""}” · about €${minP}–€${maxP} · median ≈ €${mid}. Strongest storefront signal: ${bestTrust?.store ?? "n/a"}. We rank on trust, reviews, and fit—always confirm specs before checkout.`;
}
