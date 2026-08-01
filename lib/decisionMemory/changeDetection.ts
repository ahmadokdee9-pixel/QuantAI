import type {
  DecisionAction,
  DecisionChange,
  DecisionMemoryWriteInput,
} from "@/lib/decisionMemory/types";

// DecisionChange kind used for domain-aware price labels.

type ComparableEpisode = {
  decision: DecisionAction | string;
  confidence: number | null;
  price: number | null;
  availability: string | null;
};

function num(n: number | null | undefined): number | null {
  if (typeof n !== "number" || !Number.isFinite(n)) return null;
  return n;
}

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Diff two decision episodes for the same product. */
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
      label: `${prevDecision} became ${nextDecision}`,
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

  const prevAvail = (previous.availability || "").trim();
  const nextAvail = (current.availability || "").trim();
  if (prevAvail && nextAvail && prevAvail.toLowerCase() !== nextAvail.toLowerCase()) {
    changes.push({
      kind: "availability_changed",
      label: `Availability changed (${prevAvail} → ${nextAvail})`,
      previous: prevAvail,
      current: nextAvail,
    });
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
