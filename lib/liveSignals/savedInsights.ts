export type SavedRowInsight = {
  headline: string;
  detail: string;
  tone: "neutral" | "positive" | "watch";
};

type SavedRow = {
  title: string | null;
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

function median(nums: number[]): number | null {
  if (!nums.length) return null;
  const s = [...nums].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
}

/** Insights from persisted fields only — no fabricated price history. */
export function buildSavedItemInsights(item: SavedRow, peers: SavedRow[]): SavedRowInsight[] {
  const out: SavedRowInsight[] = [];
  const age = daysSince(item.created_at);
  const prices = peers.map((p) => p.price).filter((x): x is number => x != null && x > 0);
  const priceMed = median(prices);
  const scores = peers.map((p) => p.ai_score).filter((x): x is number => x != null && Number.isFinite(x));
  const scoreMed = median(scores);

  if (item.ai_score != null && Number.isFinite(item.ai_score)) {
    let qiFromShelf = false;
    if (scoreMed != null && peers.length >= 2) {
      const delta = item.ai_score - scoreMed;
      if (delta >= 8) {
        out.push({
          headline: "Confidence vs shelf",
          detail: `QI ${item.ai_score} clears your save median—confirm fulfilment, then move.`,
          tone: "positive",
        });
        qiFromShelf = true;
      } else if (delta <= -8) {
        out.push({
          headline: "Confidence vs shelf",
          detail: `QI ${item.ai_score} trails your save median—keep as contrast, not the default.`,
          tone: "watch",
        });
        qiFromShelf = true;
      }
    }
    if (!qiFromShelf) {
      if (item.ai_score >= 78) {
        out.push({
          headline: "Strong anchor",
          detail: `QI ${item.ai_score} reads decisive—re-open returns language once.`,
          tone: "positive",
        });
      } else if (item.ai_score < 52) {
        out.push({
          headline: "Research hold",
          detail: `QI ${item.ai_score} is soft—watch for a stronger row before you pay.`,
          tone: "watch",
        });
      } else {
        out.push({
          headline: "Balanced save",
          detail: `QI ${item.ai_score} sits mid-field—compare one alternative, then choose.`,
          tone: "neutral",
        });
      }
    }
  }

  if (item.price != null && priceMed != null && priceMed > 0) {
    const ratio = item.price / priceMed;
    if (ratio <= 0.88) {
      out.push({
        headline: "Price vs shelf",
        detail: `€${item.price} under your save median—good if trust matches.`,
        tone: "positive",
      });
    } else if (ratio >= 1.18) {
      out.push({
        headline: "Price vs shelf",
        detail: `€${item.price} above your save median—specs and warranty should earn it.`,
        tone: "watch",
      });
    }
  }

  if (age != null) {
    if (age >= 14) {
      out.push({
        headline: "Memory age",
        detail: `~${age}d on shelf—re-run the same intent to refresh QuantAI’s read.`,
        tone: "watch",
      });
    } else if (age <= 2) {
      out.push({
        headline: "Fresh signal",
        detail: "Just saved—pin Compare while the context is still sharp.",
        tone: "neutral",
      });
    }
  }

  if (item.title && /\b(watch|alert|track)\b/i.test(item.title)) {
    out.push({
      headline: "Watch intent",
      detail: "Title signals monitoring—price moves on this row rank higher in your memory.",
      tone: "neutral",
    });
  }

  const dedup: SavedRowInsight[] = [];
  const seen = new Set<string>();
  for (const x of out) {
    const k = x.headline;
    if (seen.has(k)) continue;
    seen.add(k);
    dedup.push(x);
  }

  if (dedup.length === 0) {
    dedup.push({
      headline: "Quiet row",
      detail: "Open the listing once, then ask Copilot with this shelf in context.",
      tone: "neutral",
    });
  }

  return dedup.slice(0, 4);
}
