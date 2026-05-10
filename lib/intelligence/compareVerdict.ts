import type { QuantProduct } from "@/lib/shoppingScore";
import { getFinalComposite, getStoreTrustScore, ratingValue } from "@/lib/shoppingScore";

export type CompareVerdictPayload = {
  winnerTitle: string;
  winnerLink: string;
  verdict: string;
  rationale: string[];
  confidence: "high" | "medium" | "low";
};

export function heuristicCompareVerdict(products: QuantProduct[]): CompareVerdictPayload {
  if (products.length === 0) {
    return {
      winnerTitle: "",
      winnerLink: "",
      verdict: "Add at least one product to compare.",
      rationale: [],
      confidence: "low",
    };
  }
  const list = products;
  const scored = products.map((p) => ({
    p,
    score: getFinalComposite(p, list),
    trust: getStoreTrustScore(p.store),
    rating: ratingValue(p.rating),
    reviews: p.reviewsCount ?? 0,
  }));
  scored.sort((a, b) => b.score - a.score);
  const top = scored[0]!;
  const w = top.p;
  const runner = scored[1];
  const third = scored[2];

  const rationale: string[] = [];

  rationale.push(
    `Why it wins: ${w.title.slice(0, 42)}${w.title.length > 42 ? "…" : ""} leads QI (${top.score}/100) in this tray—strongest blended signal you selected.`
  );

  if (runner) {
    const delta = top.score - runner.score;
    const priceGap =
      w.price > 0 && runner.p.price > 0 ? ((runner.p.price - w.price) / w.price) * 100 : null;
    rationale.push(
      `Tradeoff vs runner-up: ${delta} QI points separate the rows${
        priceGap != null && Math.abs(priceGap) > 3
          ? priceGap > 0
            ? `; runner asks ~${Math.round(Math.abs(priceGap))}% more for a different balance.`
            : `; runner is ~${Math.round(Math.abs(priceGap))}% cheaper—paying in composite, not euros.`
          : "—price and composite are not telling the same story."
      }`
    );
    if (runner.trust > top.trust + 6) {
      rationale.push(
        `Hidden risk: runner’s retailer trust (${runner.trust}) edges the winner (${top.trust})—if checkout anxiety matters, re-weight manually.`
      );
    } else if (top.trust > runner.trust + 6) {
      rationale.push(
        `Trust edge: winner’s storefront signal (${top.trust}) clears the runner (${runner.trust})—lower friction tax at buy time.`
      );
    }
    if (runner.rating > top.rating + 0.25 && top.score >= runner.score) {
      rationale.push(
        `Rating nuance: runner stars (${runner.rating.toFixed(1)}) beat the winner (${top.rating.toFixed(1)})—QI still prefers this row on price-to-quality and trust mix.`
      );
    }
  }

  if (runner) {
    rationale.push(
      `Opportunity cost: runner holds QI ${runner.score}/100—you forfeit ${top.score - runner.score} composite points if you walk away from the winner.`
    );
  }
  if (third && runner) {
    rationale.push(
      `Bench signal: third row (${third.p.title.slice(0, 36)}${third.p.title.length > 36 ? "…" : ""}) sits at ${third.score}/100—useful if both leaders compromise on the wrong axis for you.`
    );
  }

  if (top.rating < 4.1 && top.rating > 0) {
    rationale.push("Residual risk: winner’s rating is not elite—pair the buy with a return-friendly policy check.");
  }

  const verdict =
    products.length >= 2
      ? `QuantAI lines up behind ${w.title.slice(0, 56)}${w.title.length > 56 ? "…" : ""} unless you explicitly value what the runner still does better (price, stars, or a calmer seller).`
      : `Single-row compare: ${w.title.slice(0, 56)}${w.title.length > 56 ? "…" : ""} is your only lens—add peers to surface tradeoffs.`;

  const confidence: CompareVerdictPayload["confidence"] =
    products.length >= 3 && top.score - (runner?.score ?? 0) >= 6
      ? "high"
      : products.length >= 2
        ? "medium"
        : "low";

  return {
    winnerTitle: w.title,
    winnerLink: w.link,
    verdict,
    rationale: rationale.slice(0, 6),
    confidence,
  };
}
