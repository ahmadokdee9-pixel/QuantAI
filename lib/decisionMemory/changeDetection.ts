import type {
  DecisionAction,
  DecisionChange,
  DecisionMemoryWriteInput,
} from "@/lib/decisionMemory/types";
import {
  detectThesisContinuityChanges,
  extractThesisSnapshot,
} from "@/lib/decisionThesis/snapshot";

type ComparableEpisode = {
  decision: DecisionAction | string;
  confidence: number | null;
  price: number | null;
  availability: string | null;
  rating?: number | null;
  stockState?: string | null;
  merchant?: string | null;
  provider?: string | null;
  domain?: string | null;
  evidence?: unknown[] | null;
};

function num(n: number | null | undefined): number | null {
  if (typeof n !== "number" || !Number.isFinite(n)) return null;
  return n;
}

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

function str(v: string | null | undefined): string {
  return (v || "").trim();
}

/** Diff two decision episodes for the same living decision thread. */
export function detectDecisionChanges(
  previous: ComparableEpisode | null | undefined,
  current: DecisionMemoryWriteInput | ComparableEpisode
): DecisionChange[] {
  if (!previous) return [];

  const changes: DecisionChange[] = [];
  const prevDecision = String(previous.decision || "").toUpperCase();
  const nextDecision = String(current.decision || "").toUpperCase();

  if (prevDecision && nextDecision && prevDecision !== nextDecision) {
    changes.push({
      kind: "decision_changed",
      label: `Recommendation changed to ${nextDecision}`,
      previous: prevDecision,
      current: nextDecision,
    });
  }

  const prevPrice = num(previous.price);
  const nextPrice = num(current.price);
  if (prevPrice != null && nextPrice != null && roundMoney(prevPrice) !== roundMoney(nextPrice)) {
    const dropped = nextPrice < prevPrice;
    const domain =
      "domain" in current && typeof current.domain === "string" ? current.domain : "product";
    let kind: DecisionChange["kind"] = "price_changed";
    let noun = "Price";
    if (domain === "flight") {
      kind = "fare_changed";
      noun = "Fare";
    } else if (domain === "subscription") {
      kind = "subscription_price_changed";
      noun = "Subscription price";
    } else if (domain === "hotel") {
      noun = "Stay rate";
    }
    changes.push({
      kind,
      label: dropped
        ? `${noun} dropped (€${roundMoney(prevPrice)} → €${roundMoney(nextPrice)})`
        : `${noun} rose (€${roundMoney(prevPrice)} → €${roundMoney(nextPrice)})`,
      previous: roundMoney(prevPrice),
      current: roundMoney(nextPrice),
    });
  }

  const prevConf = num(previous.confidence);
  const nextConf = num(current.confidence);
  if (prevConf != null && nextConf != null && Math.round(prevConf) !== Math.round(nextConf)) {
    const up = nextConf > prevConf;
    changes.push({
      kind: "confidence_changed",
      label: up
        ? `Confidence increased (${Math.round(prevConf)}% → ${Math.round(nextConf)}%)`
        : `Confidence decreased (${Math.round(prevConf)}% → ${Math.round(nextConf)}%)`,
      previous: Math.round(prevConf),
      current: Math.round(nextConf),
    });
  }

  const prevAvail = str(previous.availability);
  const nextAvail = str(
    "availability" in current ? current.availability : null
  );
  if (prevAvail && nextAvail && prevAvail.toLowerCase() !== nextAvail.toLowerCase()) {
    changes.push({
      kind: "availability_changed",
      label: `Availability changed (${prevAvail} → ${nextAvail})`,
      previous: prevAvail,
      current: nextAvail,
    });
  }

  const prevRating = num(previous.rating);
  const nextRating = num("rating" in current ? current.rating : null);
  if (
    prevRating != null &&
    nextRating != null &&
    Math.round(prevRating * 10) !== Math.round(nextRating * 10)
  ) {
    changes.push({
      kind: "rating_changed",
      label:
        nextRating > prevRating
          ? `Rating improved (${prevRating.toFixed(1)} → ${nextRating.toFixed(1)})`
          : `Rating declined (${prevRating.toFixed(1)} → ${nextRating.toFixed(1)})`,
      previous: Number(prevRating.toFixed(1)),
      current: Number(nextRating.toFixed(1)),
    });
  }

  const prevStock = str(previous.stockState);
  const nextStock = str("stockState" in current ? current.stockState : null);
  if (prevStock && nextStock && prevStock.toLowerCase() !== nextStock.toLowerCase()) {
    changes.push({
      kind: "stock_changed",
      label: `Stock changed (${prevStock} → ${nextStock})`,
      previous: prevStock,
      current: nextStock,
    });
  }

  const prevProvider = str(previous.provider || previous.merchant);
  const nextProvider = str(
    ("provider" in current ? current.provider : null) ||
      ("merchant" in current ? current.merchant : null)
  );
  if (prevProvider && nextProvider && prevProvider.toLowerCase() !== nextProvider.toLowerCase()) {
    changes.push({
      kind: "provider_changed",
      label: `Provider changed (${prevProvider} → ${nextProvider})`,
      previous: prevProvider,
      current: nextProvider,
    });
  }

  const betterAlt =
    "betterAlternativeTitle" in current && typeof current.betterAlternativeTitle === "string"
      ? current.betterAlternativeTitle.trim()
      : "";
  if (betterAlt) {
    changes.push({
      kind: "better_alternative",
      label: `Better alternative discovered: ${betterAlt}`,
      current: betterAlt,
    });
  }

  const prevThesis = extractThesisSnapshot(previous.evidence);
  const nextThesis = extractThesisSnapshot(
    "evidence" in current ? current.evidence : null
  );
  const thesisChanges = detectThesisContinuityChanges(prevThesis, nextThesis);
  for (const tc of thesisChanges) {
    // thesis_confirmed only when other material movement happened (held through change).
    if (tc.kind === "thesis_confirmed" && changes.length === 0) continue;
    changes.push(tc);
  }

  return changes;
}

export function confidenceTrend(
  previous: number | null | undefined,
  current: number | null | undefined
): "Improving" | "Stable" | "Declining" | null {
  const a = num(previous);
  const b = num(current);
  if (a == null || b == null) return null;
  const delta = Math.round(b) - Math.round(a);
  if (delta >= 3) return "Improving";
  if (delta <= -3) return "Declining";
  return "Stable";
}

export function summarizeUpdate(changes: DecisionChange[]): string {
  if (changes.length === 0) return "Decision rechecked — no material change";
  return changes.map((c) => c.label).join(" · ");
}

export function changeBadgeLabel(kind: DecisionChange["kind"] | "recorded"): string {
  switch (kind) {
    case "price_changed":
    case "fare_changed":
    case "subscription_price_changed":
      return "Price";
    case "confidence_changed":
      return "Confidence";
    case "decision_changed":
      return "Recommendation";
    case "availability_changed":
      return "Availability";
    case "rating_changed":
      return "Rating";
    case "stock_changed":
      return "Stock";
    case "provider_changed":
      return "Provider";
    case "better_alternative":
      return "Alternative";
    case "policy_changed":
      return "Policy";
    case "thesis_confirmed":
      return "Thesis holds";
    case "thesis_updated":
      return "Thesis";
    case "thesis_invalidated":
      return "Thesis broke";
    default:
      return "Update";
  }
}
