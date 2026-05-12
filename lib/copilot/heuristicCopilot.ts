import type { CopilotProductBrief, CopilotSessionPayload } from "@/lib/copilot/sessionTypes";
import {
  emptyStructured,
  type CopilotStructuredResponse,
} from "@/lib/copilot/structuredResponse";
import { getStoreTrustScore } from "@/lib/retailTrust";
import { ratingValue } from "@/lib/shoppingScore";

function composite(p: CopilotProductBrief): number {
  if (p.qiComposite != null && Number.isFinite(p.qiComposite)) {
    return Math.round(p.qiComposite);
  }
  const r = ratingValue(p.rating);
  const trust = getStoreTrustScore(p.store);
  return Math.min(100, Math.round(42 + r * 9 + trust * 0.22));
}

function asBriefList(products: CopilotProductBrief[]): CopilotProductBrief[] {
  return [...products].filter((p) => p.title && p.link);
}

function toPicked(p: CopilotProductBrief, reason: string) {
  return { title: p.title.slice(0, 200), link: p.link, reason: reason.slice(0, 320) };
}

/** Heuristic structured copilot — no LLM; uses QuantAI fields only. */
export function buildHeuristicCopilotResponse(
  userMessage: string,
  session: CopilotSessionPayload
): CopilotStructuredResponse {
  const msg = userMessage.toLowerCase();
  const list = asBriefList(session.products);
  const composites = (p: CopilotProductBrief) => composite(p);

  if (!list.length && !session.savedSummaries.length && !session.watchlistSummaries.length) {
    return emptyStructured(
      "I do not have search results or saved items in this session yet. Run a search on the home page (or open your dashboard when signed in), then ask again."
    );
  }

  const best =
    list.length > 0
      ? [...list].sort((a, b) => composites(b) - composites(a))[0]!
      : null;
  const avoid =
    list.length > 1
      ? [...list].sort((a, b) => composites(a) - composites(b))[0]!
      : null;

  const withTrust = list.filter((p) => getStoreTrustScore(p.store) >= 56);
  const budget =
    withTrust.length > 0
      ? [...withTrust].sort((a, b) => a.price - b.price)[0]!
      : list.length > 0
        ? [...list].sort((a, b) => a.price - b.price)[0]!
        : null;

  const premium =
    list.length > 0 ? [...list].sort((a, b) => composites(b) - composites(a))[0]! : null;

  const riskWarnings: string[] = [];
  for (const p of list.slice(0, 8)) {
    const r = p.risks ?? [];
    for (const x of r.slice(0, 2)) {
      riskWarnings.push(`${p.title.slice(0, 48)}: ${x.label}`);
    }
    if (p.price > 0 && ratingValue(p.rating) > 0 && ratingValue(p.rating) < 4) {
      riskWarnings.push(`${p.title.slice(0, 48)}: weak visible rating for the price band.`);
    }
  }

  const uniq = [...new Set(riskWarnings)].slice(0, 8);

  let comparisonSummary = "";
  if (list.length >= 2) {
    const prices = list.map((p) => p.price).filter((x) => x > 0);
    const minP = Math.min(...prices);
    const maxP = Math.max(...prices);
    comparisonSummary = `Across ${list.length} visible listings for “${session.lastSearchQuery.slice(0, 80)}”, prices span roughly €${minP}–€${maxP}. Best composite signal: ${best?.title ?? "n/a"}; weakest: ${avoid?.title ?? "n/a"}.`;
  } else if (list.length === 1) {
    comparisonSummary =
      "Only one listing is in the active tray — widen the search or add compare picks for a cross-listing read.";
  } else {
    comparisonSummary = "No active search tray — using saved/watchlist context only.";
  }

  if (msg.includes("discount") || msg.includes("fake") || msg.includes("deal")) {
    const flagged = list.filter((p) =>
      (p.risks ?? []).some((r) => /discount|promo|price/i.test(r.code + r.label))
    );
    if (flagged.length) {
      uniq.unshift(
        "Discount signal: some rows show aggressive list vs “sale” gaps — verify the checkout price on the retailer site."
      );
    } else {
      uniq.unshift(
        "Discount authenticity: the feed does not expose enough promo metadata to judge “fake” discounts — compare old vs new price on the store page."
      );
    }
  }

  let finalRecommendation = "";
  if (msg.includes("avoid") || msg.includes("risk")) {
    finalRecommendation =
      uniq.length > 0
        ? `Watch for: ${uniq.slice(0, 3).join(" · ")}. Prefer listings with stronger composite scores and familiar storefronts when the feed is ambiguous.`
        : "No strong risk flags in the current feed slice — still verify seller, returns, and final checkout price.";
  } else if (msg.includes("compare") && session.compareTrayLinks.length >= 2) {
    const subset = list.filter((p) => session.compareTrayLinks.includes(p.link));
    finalRecommendation =
      subset.length >= 2
        ? `Compare tray (${subset.length}): lean toward ${subset.sort((a, b) => composites(b) - composites(a))[0]?.title ?? "the top composite"} for balance of score and store signal.`
        : "Select products in the compare tray on the home page so I can line them up with QuantAI scores.";
  } else if (msg.includes("cheap") || msg.includes("budget")) {
    finalRecommendation = budget
      ? `Budget-leaning pick from current data: ${budget.title} — lowest compliant price among safer store priors in this tray.`
      : "Add search results to suggest a budget pick.";
  } else if (msg.includes("premium") || msg.includes("best")) {
    finalRecommendation = best
      ? `Best current fit by composite: ${best.title}. ${best.qiVerdict ?? best.buyingVerdict ?? "Check delivery and final price before buying."}`
      : "No ranked listings in session.";
  } else {
    finalRecommendation = best
      ? `From the current QuantAI tray, ${best.title} leads the composite ranking. ${comparisonSummary.slice(0, 280)}`
      : "Use saved/watchlist context — add a live search for product-level scoring.";
  }

  const nextAction =
    session.route === "dashboard"
      ? "Run a fresh search from home for live listings, or open a saved product to validate price."
      : session.compareTrayLinks.length < 2
        ? "Pin 2–3 listings in Compare on the results tray for a tighter long-term value read."
        : "Open the top pick’s retailer page and confirm returns and shipping before checkout.";

  return {
    finalRecommendation: finalRecommendation.slice(0, 880),
    bestOption: best
      ? toPicked(best, `Highest composite (${Math.round(composites(best))}) in this result set.`)
      : null,
    avoidOption:
      avoid && best && avoid.link !== best.link
        ? toPicked(
            avoid,
            `Weakest composite (${Math.round(composites(avoid))}) among visible rows — only if price niche justifies it.`
          )
        : null,
    budgetPick: budget
      ? toPicked(budget, "Lower price among listings with acceptable store-trust prior in this slice.")
      : null,
    premiumPick: premium
      ? toPicked(premium, "Top composite / value signal in the current tray.")
      : null,
    riskWarnings: uniq.slice(0, 8),
    comparisonSummary: comparisonSummary.slice(0, 680),
    nextAction: nextAction.slice(0, 260),
  };
}
