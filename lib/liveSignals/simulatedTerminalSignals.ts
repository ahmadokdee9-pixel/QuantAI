import type { QuantProduct } from "@/lib/shoppingScore";
import { getFinalComposite, getStoreTrustScore } from "@/lib/shoppingScore";

export type LiveTerminalSignal = {
  id: string;
  headline: string;
  detail: string;
  tone: "neutral" | "positive" | "watch";
};

function median(nums: number[]): number {
  const s = [...nums].sort((a, b) => a - b);
  if (!s.length) return 0;
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
}

/** Deterministic, feed-only “live terminal” copy — no fake websocket data. */
export function buildLiveTerminalSignals(query: string, products: QuantProduct[]): LiveTerminalSignal[] {
  if (!products.length) return [];
  const list = products;
  const prices = list.map((p) => p.price).filter((x) => x > 0);
  const med = median(prices);
  const minP = prices.length ? Math.min(...prices) : 0;
  const maxP = prices.length ? Math.max(...prices) : 0;
  const spread = maxP > 0 && minP > 0 && med > 0 ? Math.round(((maxP - minP) / med) * 100) : 0;
  const trusts = list.map((p) => getStoreTrustScore(p.store));
  const trustSpread = Math.max(...trusts) - Math.min(...trusts);
  const top = [...list].sort((a, b) => getFinalComposite(b, list) - getFinalComposite(a, list))[0]!;
  const topQi = getFinalComposite(top, list);
  const risky = [...list].sort((a, b) => getStoreTrustScore(a.store) - getStoreTrustScore(b.store))[0]!;
  const lowTrust = getStoreTrustScore(risky.store);
  const avgRev = list.reduce((s, p) => s + (p.reviewsCount ?? 0), 0) / Math.max(1, list.length);
  const q = query.trim().slice(0, 64) || "this tray";

  const out: LiveTerminalSignal[] = [
    {
      id: "pulse",
      headline: "Signal channel live",
      detail: `Monitoring ${list.length} listings for “${q}” — composite, trust, and review depth refresh with each search.`,
      tone: "neutral",
    },
    {
      id: "spread",
      headline: "Price band in view",
      detail:
        spread > 0
          ? `Visible spread ≈ ${spread}% around tray median — ranking shifts when outliers enter or leave.`
          : "Limited price dispersion in this slice — differentiation leans on trust and reviews.",
      tone: "neutral",
    },
    {
      id: "leader",
      headline: "Ranking focal",
      detail: `Top composite row: QI ${topQi} — confidence tracks review volume and retailer priors, not hype.`,
      tone: "positive",
    },
  ];

  if (trustSpread >= 22) {
    out.push({
      id: "trust-var",
      headline: "Retailer variance detected",
      detail: `Store-trust priors diverge by ${trustSpread} points across this tray — worth manual seller checks on low-trust rows.`,
      tone: "watch",
    });
  }

  if (lowTrust < 58) {
    out.push({
      id: "thin-seller",
      headline: "Thin-seller context",
      detail: `Lowest trust prior in-tray (${lowTrust}/100) — QuantAI flags checkout friction risk, not a legal verdict.`,
      tone: "watch",
    });
  }

  if (avgRev > 120) {
    out.push({
      id: "reviews",
      headline: "Review density elevated",
      detail: "High average review counts in this slice — star signals carry more statistical weight here.",
      tone: "positive",
    });
  }

  const discountNoise = list.filter((p) => (p.qiSignals?.discountQuality ?? 50) < 42).length;
  if (discountNoise >= 2) {
    out.push({
      id: "discount",
      headline: "Discount narrative noise",
      detail: `${discountNoise} rows show weak discount-quality signals — treat “was” prices as marketing until checkout confirms.`,
      tone: "watch",
    });
  }

  out.push({
    id: "market-shift",
    headline: "Market composition",
    detail:
      list.length >= 12
        ? "Broad tray — rankings emphasize stability of composite over single-axis bargains."
        : "Tighter tray — small listing changes can reorder the top lane; re-run if filters moved.",
    tone: "neutral",
  });

  return out.slice(0, 10);
}
