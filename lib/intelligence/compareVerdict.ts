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
};

function titleShort(p: QuantProduct, n: number) {
  return p.title.slice(0, n) + (p.title.length > n ? "…" : "");
}

export function heuristicCompareVerdict(products: QuantProduct[]): CompareVerdictPayload {
  if (products.length === 0) {
    return {
      winnerTitle: "",
      winnerLink: "",
      verdict: "Add at least one product to compare.",
      rationale: [],
      confidence: "low",
      verificationNote: "No rows selected — run Compare lab from live search results.",
    };
  }
  const list = products;
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
    `Winner on composite: ${titleShort(w, 44)} at QI ${top.score}/100 — strongest blended signal in your selection.`
  );

  tradeoffAnalysis.push(
    `Performance vs price: ${titleShort(w, 36)} vs tray — QI ${top.score}, €${w.price}, trust ${top.trust}/100.`
  );

  if (runner) {
    const delta = top.score - runner.score;
    const priceGap =
      w.price > 0 && runner.p.price > 0 ? ((runner.p.price - w.price) / w.price) * 100 : null;
    tradeoffAnalysis.push(
      `Reliability vs discount: runner-up ${titleShort(runner.p, 32)} scores ${runner.score}/100 with trust ${runner.trust}/100 and ${runner.rating.toFixed(1)}★.`
    );
    rationale.push(
      `Tradeoff vs #2: ${delta} QI points apart${
        priceGap != null && Math.abs(priceGap) > 4
          ? priceGap > 0
            ? ` — runner costs ~${Math.round(Math.abs(priceGap))}% more.`
            : ` — runner is ~${Math.round(Math.abs(priceGap))}% cheaper (you may trade composite for euros).`
          : " — similar price bands."
      }`
    );
    if (runner.trust > top.trust + 8) {
      rationale.push(
        `Trust nuance: runner has clearer storefront prior (${runner.trust} vs ${top.trust}) — if checkout anxiety dominates, re-rank manually.`
      );
    } else if (top.trust > runner.trust + 8) {
      rationale.push(`Trust edge stays with the winner (${top.trust} vs ${runner.trust}) — lower dispute tax if specs match.`);
    }
    if (runner.rating > top.rating + 0.2 && runner.reviews > (top.reviews ?? 0) * 1.4) {
      rationale.push(
        `Review depth: runner shows stronger public feedback density — worth reading negatives before dismissing it.`
      );
    }
  }

  if (third && runner) {
    rationale.push(
      `Third option (${titleShort(third.p, 36)} · ${third.score}/100) is your hedge if both leaders compromise on the wrong axis.`
    );
  }

  if (top.rating < 4.15 && top.rating > 0) {
    rationale.push("Winner rating is not elite — pair the buy with a return-friendly policy check.");
  }

  const verdict =
    products.length >= 2
      ? `QuantAI selects ${titleShort(w, 52)} as the best-balanced pick in this compare set unless you overweight a dimension the runner still wins (price, stars, or calmer seller story).`
      : `Single-row compare: ${titleShort(w, 52)} — add peers to unlock structured tradeoffs.`;

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
        reason: "Lower checkout while composite is still respectable.",
      });
    }
    if (top.trust >= runner.trust) {
      personas.push({
        persona: "risk_averse",
        pick: titleShort(w, 48),
        reason: "Higher composite with equal or better trust prior in this slice.",
      });
    }
    if (runner.vfm > top.vfm + 8) {
      personas.push({
        persona: "value_max",
        pick: titleShort(runner.p, 48),
        reason: "Higher modeled value-for-money vs peers in the feed signals.",
      });
    }
  }
  personas.push({
    persona: "long_term",
    pick: titleShort(w, 48),
    reason: "Composite favors sustained quality mix (trust + reviews + price performance) in-tray.",
  });

  const shortTermPick =
    runner && runner.p.price < w.price * 0.9
      ? `${titleShort(runner.p, 40)} if you need the cheapest acceptable composite today.`
      : `${titleShort(w, 40)} — already near the pragmatic price floor for its score band.`;

  const longTermPick = `${titleShort(w, 48)} for fewer surprises if you keep products for years—verify warranty and seller.`;

  const verificationNote =
    confidence === "high"
      ? "Signals separate cleanly, but feeds lack warranty and post-purchase data — confirm material facts at checkout."
      : "Moderate/low separation or thinner data — treat this as orientation; read recent reviews and seller policies.";

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
  };
}
