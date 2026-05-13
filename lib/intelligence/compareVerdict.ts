import type {
  CompareAxisInsight,
  CompareSmartSignal,
  CompareVerdictBadge,
  CompareVerdictLabelId,
} from "@/lib/intelligence/compareIntelligence";
import { buildCompareIntelligenceSnapshot } from "@/lib/intelligence/compareIntelligence";
import type { QuantProduct } from "@/lib/shoppingScore";
import { getFinalComposite, getStoreTrustScore, ratingValue } from "@/lib/shoppingScore";

export type CompareVerdictPayload = {
  winnerTitle: string;
  winnerLink: string;
  verdict: string;
  rationale: string[];
  confidence: "high" | "medium" | "low";
  /** Structured tradeoff axes (feed-visible signals only). */
  tradeoffAnalysis?: string[];
  /** Which row fits which shopping stance. */
  bestForPersonas?: { persona: string; pick: string; reason: string }[];
  shortTermPick?: string;
  longTermPick?: string;
  verificationNote?: string;
  /** Analyst stance chips — deterministic from tray + pins. */
  primaryVerdictLabel: CompareVerdictLabelId;
  comparisonConfidenceScore: number;
  verdictBadges: CompareVerdictBadge[];
  axisInsights: CompareAxisInsight[];
  smartSignals: CompareSmartSignal[];
};

function titleShort(p: QuantProduct, n: number) {
  return p.title.slice(0, n) + (p.title.length > n ? "…" : "");
}

function snapshotList(products: QuantProduct[], tray?: QuantProduct[]): QuantProduct[] {
  if (tray != null && tray.length >= products.length) return tray;
  return products;
}

export function enrichVerdictWithCompareIntelligence(
  base: Pick<CompareVerdictPayload, "winnerTitle" | "winnerLink" | "verdict" | "rationale" | "confidence"> &
    Partial<Omit<CompareVerdictPayload, "winnerTitle" | "winnerLink" | "verdict" | "rationale" | "confidence">>,
  products: QuantProduct[],
  tray?: QuantProduct[]
): CompareVerdictPayload {
  const snap = buildCompareIntelligenceSnapshot(products, snapshotList(products, tray));
  return {
    ...base,
    primaryVerdictLabel: snap.primaryVerdictId,
    comparisonConfidenceScore: snap.comparisonConfidenceScore,
    verdictBadges: snap.verdictBadges,
    axisInsights: snap.axisInsights,
    smartSignals: snap.smartSignals,
  };
}

export function heuristicCompareVerdict(
  products: QuantProduct[],
  tray?: QuantProduct[]
): CompareVerdictPayload {
  const list = snapshotList(products, tray);
  const snap = buildCompareIntelligenceSnapshot(products, list);

  if (products.length === 0) {
    return {
      winnerTitle: "",
      winnerLink: "",
      verdict: "Pin two or three finalists to open Compare Intelligence.",
      rationale: [],
      confidence: "low",
      verificationNote: "No rows selected — compare from live search results.",
      primaryVerdictLabel: "best_overall",
      comparisonConfidenceScore: 0,
      verdictBadges: [],
      axisInsights: [],
      smartSignals: [],
    };
  }

  const scored = products.map((p) => ({
    p,
    score: getFinalComposite(p, list),
    trust: getStoreTrustScore(p.store),
    rating: ratingValue(p.rating),
    reviews: p.reviewsCount ?? 0,
    vfm: p.qiCommerce?.valueForMoney ?? 50,
    risk: p.qiCommerce?.retailerRiskScore ?? 40,
  }));
  scored.sort((a, b) => b.score - a.score);
  const top = scored[0]!;
  const w = top.p;
  const runner = scored[1];
  const third = scored[2];

  const rationale: string[] = [];
  const tradeoffAnalysis: string[] = [];

  rationale.push(
    `Composite: ${titleShort(w, 44)} at ${top.score}/100 — strongest blended read in this pin set.`
  );

  tradeoffAnalysis.push(
    `Price vs performance: ${titleShort(w, 36)} — QI ${top.score}, €${w.price}, trust prior ${top.trust}/100.`
  );

  if (runner) {
    const delta = top.score - runner.score;
    const priceGap =
      w.price > 0 && runner.p.price > 0 ? ((runner.p.price - w.price) / w.price) * 100 : null;
    tradeoffAnalysis.push(
      `Runner ${titleShort(runner.p, 32)}: ${runner.score}/100, trust ${runner.trust}/100, ${runner.rating.toFixed(1)}★.`
    );
    rationale.push(
      `Spread vs #2: ${delta} QI points${
        priceGap != null && Math.abs(priceGap) > 4
          ? priceGap > 0
            ? `; runner is ~${Math.round(Math.abs(priceGap))}% pricier.`
            : `; runner is ~${Math.round(Math.abs(priceGap))}% cheaper — composite trade may apply.`
          : "; similar price bands."
      }`
    );
    if (runner.trust > top.trust + 8) {
      rationale.push(
        `Trust nuance: runner carries a higher storefront prior (${runner.trust} vs ${top.trust}) — re-rank if policy risk dominates.`
      );
    } else if (top.trust > runner.trust + 8) {
      rationale.push(`Trust stays with the leader (${top.trust} vs ${runner.trust}) — lower dispute tax if specs match.`);
    }
    if (runner.rating > top.rating + 0.2 && runner.reviews > (top.reviews ?? 0) * 1.4) {
      rationale.push(`Review density favors the runner — scan recent negatives before you dismiss it.`);
    }
  }

  if (third && runner) {
    rationale.push(
      `Third lane (${titleShort(third.p, 36)} · ${third.score}/100) hedges if both leaders miss on the axis you care about.`
    );
  }

  if (top.rating < 4.15 && top.rating > 0) {
    rationale.push("Leader stars are mid-band — pair the buy with a return-friendly policy read.");
  }

  const primaryLabel = snap.primaryVerdictId;
  const labelDisplay =
    primaryLabel === "safest_buy"
      ? "Safest buy"
      : primaryLabel === "best_value"
        ? "Best value"
        : primaryLabel === "avoid_overpriced"
          ? "Caution on overpriced lane"
          : "Best overall";

  const verdict =
    products.length >= 2
      ? `${labelDisplay}: lean ${titleShort(w, 52)} unless you deliberately overweight trust, euros, or review depth where a runner still leads. Signals are tray-relative — confirm SKU parity at checkout.`
      : `Single pin: ${titleShort(w, 52)} — add a peer to unlock cross-axis separation.`;

  const confidence: CompareVerdictPayload["confidence"] =
    products.length >= 3 && top.score - (runner?.score ?? 0) >= 7
      ? "high"
      : products.length >= 2
        ? "medium"
        : "low";

  const personas: CompareVerdictPayload["bestForPersonas"] = [];
  if (runner) {
    if (runner.p.price < w.price * 0.92) {
      personas.push({
        persona: "budget_buyer",
        pick: titleShort(runner.p, 48),
        reason: "Lower checkout with still-respectable composite.",
      });
    }
    if (top.trust >= runner.trust) {
      personas.push({
        persona: "risk_averse",
        pick: titleShort(w, 48),
        reason: "Higher composite with equal or stronger trust prior in this slice.",
      });
    }
    if (runner.vfm > top.vfm + 8) {
      personas.push({
        persona: "value_max",
        pick: titleShort(runner.p, 48),
        reason: "Modeled value-for-money reads higher on feed cues.",
      });
    }
  }
  personas.push({
    persona: "long_term",
    pick: titleShort(w, 48),
    reason: "Composite weights trust, reviews, and price performance for a steadier ownership arc.",
  });

  const shortTermPick =
    runner && runner.p.price < w.price * 0.9
      ? `${titleShort(runner.p, 40)} if you need the cheapest acceptable composite today.`
      : `${titleShort(w, 40)} — near the pragmatic floor for its score band.`;

  const longTermPick = `${titleShort(w, 48)} for fewer surprises across ownership — verify warranty and seller.`;

  const verificationNote =
    confidence === "high"
      ? "Separation is clean, yet feeds omit warranty and post-purchase detail — validate material facts on the store page."
      : "Moderate separation or thinner data — orientation only; read recent reviews and policies.";

  return {
    winnerTitle: w.title,
    winnerLink: w.link,
    verdict,
    rationale: rationale.slice(0, 8),
    confidence,
    tradeoffAnalysis: tradeoffAnalysis.slice(0, 5),
    bestForPersonas: personas.slice(0, 4),
    shortTermPick,
    longTermPick,
    verificationNote,
    primaryVerdictLabel: snap.primaryVerdictId,
    comparisonConfidenceScore: snap.comparisonConfidenceScore,
    verdictBadges: snap.verdictBadges,
    axisInsights: snap.axisInsights,
    smartSignals: snap.smartSignals,
  };
}
