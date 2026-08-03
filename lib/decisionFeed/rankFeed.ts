/**
 * Intelligent Decision Feed ranking — biggest decision changes first.
 */

import type { DecisionAction, DecisionChange, DecisionChangeKind } from "@/lib/decisionMemory/types";
import type { FeedPriority } from "@/lib/decisionFeed/types";

const CRITICAL_KINDS = new Set<DecisionChangeKind>([
  "decision_changed",
  "stock_changed",
  "better_alternative",
  "thesis_invalidated",
]);

const IMPORTANT_KINDS = new Set<DecisionChangeKind>([
  "price_changed",
  "fare_changed",
  "subscription_price_changed",
  "confidence_changed",
  "availability_changed",
  "thesis_updated",
  "thesis_confirmed",
]);

function isUpgrade(prev: string | null | undefined, next: string | null | undefined): boolean {
  const order: Record<string, number> = { AVOID: 0, WAIT: 1, COMPARE: 2, BUY: 3 };
  const a = order[String(prev || "").toUpperCase()];
  const b = order[String(next || "").toUpperCase()];
  if (a == null || b == null) return false;
  return b > a;
}

function isDowngrade(prev: string | null | undefined, next: string | null | undefined): boolean {
  const order: Record<string, number> = { AVOID: 0, WAIT: 1, COMPARE: 2, BUY: 3 };
  const a = order[String(prev || "").toUpperCase()];
  const b = order[String(next || "").toUpperCase()];
  if (a == null || b == null) return false;
  return b < a;
}

export function classifyFeedPriority(args: {
  changes: DecisionChange[];
  previousDecision?: DecisionAction | string | null;
  currentDecision?: DecisionAction | string | null;
  previousPrice?: number | null;
  currentPrice?: number | null;
  watched?: boolean;
}): FeedPriority {
  const { changes } = args;
  if (!changes.length) return "informational";

  const kinds = new Set(changes.map((c) => c.kind));

  // Recommendation flip is always critical
  if (kinds.has("decision_changed")) {
    if (
      isUpgrade(args.previousDecision, args.currentDecision) ||
      isDowngrade(args.previousDecision, args.currentDecision)
    ) {
      return "critical";
    }
    return "critical";
  }

  // Stock out / material stock change
  if (kinds.has("stock_changed")) {
    const stock = changes.find((c) => c.kind === "stock_changed");
    const cur = String(stock?.current || "").toLowerCase();
    if (cur.includes("out") || cur.includes("unavailable")) return "critical";
    return "important";
  }

  // Large price drop (≥8%) while watched → critical
  if (
    args.watched &&
    typeof args.previousPrice === "number" &&
    typeof args.currentPrice === "number" &&
    args.previousPrice > 0
  ) {
    const dropPct = ((args.previousPrice - args.currentPrice) / args.previousPrice) * 100;
    if (dropPct >= 8) return "critical";
  }

  if (kinds.has("better_alternative")) return "critical";
  if (kinds.has("thesis_invalidated")) return "critical";

  for (const kind of kinds) {
    if (IMPORTANT_KINDS.has(kind)) return "important";
  }

  if ([...kinds].some((k) => CRITICAL_KINDS.has(k))) return "important";
  return "informational";
}

export function scoreFeedItem(args: {
  priority: FeedPriority;
  changes: DecisionChange[];
  timestamp: string;
  watched: boolean;
  previousPrice?: number | null;
  currentPrice?: number | null;
  previousConfidence?: number | null;
  currentConfidence?: number | null;
  previousDecision?: string | null;
  currentDecision?: string | null;
}): number {
  let score =
    args.priority === "critical" ? 1000 : args.priority === "important" ? 600 : 250;

  if (args.watched) score += 80;

  // Recency: last 24h boost, decay after
  const ageMs = Date.now() - new Date(args.timestamp).getTime();
  const ageHours = Number.isFinite(ageMs) ? ageMs / 3_600_000 : 72;
  if (ageHours <= 6) score += 120;
  else if (ageHours <= 24) score += 70;
  else if (ageHours <= 72) score += 30;
  else score += Math.max(0, 20 - ageHours / 24);

  // Price magnitude
  if (
    typeof args.previousPrice === "number" &&
    typeof args.currentPrice === "number" &&
    args.previousPrice > 0
  ) {
    const pct = Math.abs((args.currentPrice - args.previousPrice) / args.previousPrice) * 100;
    score += Math.min(150, pct * 4);
    if (args.currentPrice < args.previousPrice) score += 40; // drops outrank rises slightly
  }

  // Confidence swing
  if (
    typeof args.previousConfidence === "number" &&
    typeof args.currentConfidence === "number"
  ) {
    score += Math.min(80, Math.abs(args.currentConfidence - args.previousConfidence) * 2);
  }

  // Recommendation direction weight
  if (isUpgrade(args.previousDecision, args.currentDecision)) score += 90;
  if (isDowngrade(args.previousDecision, args.currentDecision)) score += 100;

  // Kind density
  score += Math.min(60, args.changes.length * 12);

  for (const change of args.changes) {
    if (change.kind === "decision_changed") score += 50;
    if (change.kind === "thesis_invalidated") score += 55;
    if (change.kind === "thesis_updated") score += 30;
    if (change.kind === "thesis_confirmed") score += 20;
    if (change.kind === "better_alternative") score += 45;
    if (change.kind === "fare_changed" || change.kind === "subscription_price_changed") {
      score += 25;
    }
  }

  return Math.round(score);
}

export function primaryChangeKind(
  changes: DecisionChange[]
): DecisionChangeKind | "recorded" {
  if (!changes.length) return "recorded";
  const order: DecisionChangeKind[] = [
    "decision_changed",
    "thesis_invalidated",
    "better_alternative",
    "stock_changed",
    "thesis_updated",
    "price_changed",
    "fare_changed",
    "subscription_price_changed",
    "confidence_changed",
    "thesis_confirmed",
    "availability_changed",
    "rating_changed",
    "provider_changed",
    "policy_changed",
  ];
  for (const kind of order) {
    if (changes.some((c) => c.kind === kind)) return kind;
  }
  return changes[0]!.kind;
}
