type DigestInput = {
  savedCount: number;
  watchlistCount: number;
  historyQueries: string[];
  compareCount: number;
  memoryLine: string | null;
};

export type DigestLine = { id: string; text: string };

/** Qualitative session digest — no fabricated purchase or user metrics. */
export function buildSessionDigest(input: DigestInput): DigestLine[] {
  const lines: DigestLine[] = [];
  const { savedCount, watchlistCount, historyQueries, compareCount, memoryLine } = input;

  if (memoryLine) {
    lines.push({
      id: "mem",
      text: `Session recall: ${memoryLine}`,
    });
  }

  if (savedCount >= 3) {
    lines.push({
      id: "saved-strong",
      text: `${savedCount} saved anchors on file — strong moment to run Compare lab on finalists and export a receipt-style snapshot.`,
    });
  } else if (savedCount > 0) {
    lines.push({
      id: "saved-light",
      text: `${savedCount} saved listing${savedCount === 1 ? "" : "s"} — add one more anchor from search, then stress-test with a side-by-side verdict.`,
    });
  }

  if (watchlistCount >= 2) {
    lines.push({
      id: "watch",
      text: `${watchlistCount} watchlist rows — keep timing notes beside each link; QuantAI treats alerts as policy-backed, not hype timers.`,
    });
  }

  const lastQ = historyQueries[0]?.trim();
  if (lastQ) {
    lines.push({
      id: "last-q",
      text: `Recent query signal: “${lastQ.slice(0, 72)}${lastQ.length > 72 ? "…" : ""}” — re-open from history to refresh the tray.`,
    });
  }

  if (compareCount >= 2) {
    lines.push({
      id: "compare",
      text: `${compareCount} recent compare snapshots — good audit trail for how verdicts moved as listings changed.`,
    });
  }

  if (lines.length === 0) {
    lines.push({
      id: "default",
      text: "Cockpit is warm — run a live query to populate saves, watchlist, and compare receipts; digest updates from real tray geometry only.",
    });
  }

  return lines.slice(0, 5);
}
