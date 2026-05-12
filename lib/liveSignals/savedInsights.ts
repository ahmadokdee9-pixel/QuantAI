export type SavedRowInsight = {
  headline: string;
  detail: string;
  tone: "neutral" | "positive" | "watch";
};

type SavedRow = {
  price: number | null;
  ai_score?: number | null;
  created_at?: string;
};

function daysSince(iso?: string): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  return Math.max(0, Math.round((Date.now() - t) / 86400000));
}

/** Insights from persisted fields only — no fabricated price history. */
export function buildSavedItemInsights(item: SavedRow, peers: SavedRow[]): SavedRowInsight[] {
  const out: SavedRowInsight[] = [];
  const age = daysSince(item.created_at);
  const prices = peers.map((p) => p.price).filter((x): x is number => x != null && x > 0);
  const med =
    prices.length === 0
      ? null
      : [...prices].sort((a, b) => a - b)[Math.floor(prices.length / 2)] ?? null;

  if (item.ai_score != null) {
    if (item.ai_score >= 78) {
      out.push({
        headline: "Value posture · strong",
        detail: `Saved AI score ${item.ai_score} reads as a confident composite anchor — still verify seller and returns language at checkout.`,
        tone: "positive",
      });
    } else if (item.ai_score < 52) {
      out.push({
        headline: "Watchlist discipline",
        detail: `Saved AI score ${item.ai_score} is soft — treat as “research hold”, not a buy signal, until trust and reviews line up.`,
        tone: "watch",
      });
    } else {
      out.push({
        headline: "Balanced save",
        detail: `Saved AI score ${item.ai_score} sits mid-band — good candidate to compare against one higher-trust alternative before purchase.`,
        tone: "neutral",
      });
    }
  }

  if (item.price != null && med != null && med > 0) {
    const ratio = item.price / med;
    if (ratio <= 0.88) {
      out.push({
        headline: "Price vs saved shelf median",
        detail: `Listed €${item.price} sits below your saved shelf median — if trust is acceptable, timing favors execution over more browsing.`,
        tone: "positive",
      });
    } else if (ratio >= 1.18) {
      out.push({
        headline: "Premium vs your shelf",
        detail: `Listed €${item.price} is elevated vs other saves — confirm spec match and warranty terms before paying the premium.`,
        tone: "watch",
      });
    }
  }

  if (age != null) {
    if (age >= 14) {
      out.push({
        headline: "Stale listing check",
        detail: `Saved ~${age}d ago — markets move; re-run search on the same intent to see if newer listings reshaped the cluster.`,
        tone: "watch",
      });
    } else if (age <= 2) {
      out.push({
        headline: "Fresh anchor",
        detail: "Recently saved — good window to pin a compare lane while context is still fresh.",
        tone: "neutral",
      });
    }
  }

  if (out.length === 0) {
    out.push({
      headline: "Intelligent hold",
      detail: "No extra telemetry on this row yet — open the listing, skim fulfilment language, then ask Copilot with the saved tray loaded.",
      tone: "neutral",
    });
  }

  return out.slice(0, 3);
}
