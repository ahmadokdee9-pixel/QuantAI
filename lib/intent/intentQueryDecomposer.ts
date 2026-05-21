/**
 * P5.3 — Deterministic query decomposition (token grouping; no embeddings).
 */

import type { CanonicalQueryContract } from "@/lib/search/canonicalQuery";

export type IntentPartitionId =
  | "compare"
  | "budget"
  | "trust"
  | "urgent"
  | "review"
  | "premium"
  | "discount"
  | "quality"
  | "recommendation"
  | "mixed_language"
  | "long_natural";

export type IntentPartition = {
  id: IntentPartitionId;
  tokens: string[];
  priority: number;
  modifierStrength: number;
};

export type QueryDecomposition = {
  partitions: IntentPartition[];
  decompositionScore: number;
  routingLane: "primary" | "secondary" | "conflict" | "reinforce" | "hold";
  expansionCount: number;
  replayHash: string;
};

const LEXICON: Record<IntentPartitionId, RegExp[]> = {
  compare: [/\bcompare\b/i, /\bvs\b/i, /\bversus\b/i, /\blike\b/i],
  budget: [/\bcheap\b/i, /\bbudget\b/i, /\bunder\b/i, /\baffordable\b/i, /\bgood\b/i, /ارخص/i, /\bbut\b/i],
  trust: [/\btrusted\b/i, /\bauthentic\b/i, /\bseller\b/i, /\blow risk\b/i, /\bshipping\b/i],
  urgent: [/\burgent\b/i, /\bhurry\b/i, /\bthis week\b/i, /\bdelivery\b/i, /\bfast\b/i, /\bneed it\b/i],
  review: [/\breview\b/i, /\brating\b/i, /\bfeedback\b/i],
  premium: [/\bpremium\b/i, /\bluxury\b/i, /\bauthentic\b/i, /\bhigh end\b/i],
  discount: [/\bdeal\b/i, /\bdiscount\b/i, /\boff\b/i, /\bsale\b/i],
  quality: [/\bgood\b/i, /\bquality\b/i, /\bbest\b/i],
  recommendation: [/\brecommend\b/i, /\bsuggest\b/i, /\bbest\b/i],
  mixed_language: [/[\u0600-\u06FF]/],
  long_natural: [],
};

const CONFLICT_PAIRS: [IntentPartitionId, IntentPartitionId][] = [
  ["premium", "budget"],
  ["premium", "discount"],
  ["compare", "recommendation"],
  ["urgent", "review"],
];

function tokenize(query: string): string[] {
  return query
    .trim()
    .toLowerCase()
    .split(/[\s,;]+/)
    .filter(Boolean)
    .slice(0, 48);
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

function detectPartition(id: IntentPartitionId, query: string, tokens: string[]): IntentPartition | null {
  if (id === "long_natural") {
    if (tokens.length < 6) return null;
    return { id, tokens: tokens.slice(0, 8), priority: 35, modifierStrength: clamp01(tokens.length / 20) };
  }
  if (id === "mixed_language") {
    if (!LEXICON.mixed_language[0].test(query)) return null;
    const matched = tokens.filter((t) => /[\u0600-\u06FF]/.test(t));
    return { id, tokens: matched.slice(0, 6), priority: 55, modifierStrength: 0.7 };
  }

  const patterns = LEXICON[id];
  const matched = tokens.filter((t) => patterns.some((re) => re.test(t)));
  if (matched.length === 0 && !patterns.some((re) => re.test(query))) return null;

  const strength = clamp01(matched.length / Math.max(1, tokens.length) + 0.2);
  const priorityMap: Partial<Record<IntentPartitionId, number>> = {
    compare: 80,
    budget: 75,
    trust: 85,
    urgent: 70,
    review: 50,
    premium: 65,
    discount: 60,
    quality: 55,
    recommendation: 45,
  };
  return {
    id,
    tokens: matched.length ? matched : tokens.slice(0, 3),
    priority: priorityMap[id] ?? 40,
    modifierStrength: strength,
  };
}

function enrichFromCanonical(partitions: IntentPartition[], canonical: CanonicalQueryContract): IntentPartition[] {
  const out = [...partitions];
  const has = (id: IntentPartitionId) => out.some((p) => p.id === id);

  if (canonical.budget.active && !has("budget")) {
    out.push({ id: "budget", tokens: ["budget"], priority: 75, modifierStrength: clamp01(canonical.budget.intent01) });
  }
  if (
    (canonical.intent.primary === "market_compare" || canonical.marketMode === "hybrid_compare") &&
    !has("compare")
  ) {
    out.push({ id: "compare", tokens: ["compare"], priority: 80, modifierStrength: 0.75 });
  }
  if (canonical.intent.primary === "premium" && !has("premium")) {
    out.push({ id: "premium", tokens: ["premium"], priority: 65, modifierStrength: clamp01(canonical.intent.premium01) });
  }
  if (canonical.intent.primary === "cheapest_trusted" && !has("trust")) {
    out.push({ id: "trust", tokens: ["trusted"], priority: 85, modifierStrength: 0.8 });
  }

  return out.slice(0, 8);
}

function resolveRoutingLane(partitions: IntentPartition[]): QueryDecomposition["routingLane"] {
  if (partitions.length === 0) return "hold";
  const ids = new Set(partitions.map((p) => p.id));
  for (const [a, b] of CONFLICT_PAIRS) {
    if (ids.has(a) && ids.has(b)) return "conflict";
  }
  if (partitions.length >= 3) return "reinforce";
  if (partitions.length === 1) return "primary";
  return "secondary";
}

function buildReplayHash(partitions: IntentPartition[]): string {
  return partitions
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((p) => `${p.id}:${p.priority}:${Math.round(p.modifierStrength * 100)}`)
    .join("|");
}

/** Deterministic decomposition — bounded expansion, replay-safe. */
export function decomposeShoppingQuery(args: {
  query: string;
  canonicalQuery: CanonicalQueryContract;
}): QueryDecomposition {
  const { query, canonicalQuery } = args;
  const tokens = tokenize(query);
  const ids: IntentPartitionId[] = [
    "compare",
    "budget",
    "trust",
    "urgent",
    "review",
    "premium",
    "discount",
    "quality",
    "recommendation",
    "mixed_language",
    "long_natural",
  ];

  let partitions: IntentPartition[] = [];
  for (const id of ids) {
    const part = detectPartition(id, query, tokens);
    if (part) partitions.push(part);
  }
  partitions = enrichFromCanonical(partitions, canonicalQuery);
  partitions = partitions
    .sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id))
    .slice(0, 8);

  const routingLane = resolveRoutingLane(partitions);
  const avgPriority =
    partitions.length > 0 ? partitions.reduce((s, p) => s + p.priority, 0) / partitions.length : 0;
  const decompositionScore = Math.min(100, Math.round(avgPriority * 0.6 + partitions.length * 8));

  return {
    partitions,
    decompositionScore,
    routingLane,
    expansionCount: partitions.length,
    replayHash: buildReplayHash(partitions),
  };
}

export function validateDeterministicDecomposition(a: QueryDecomposition, b: QueryDecomposition): boolean {
  return a.replayHash === b.replayHash && a.routingLane === b.routingLane;
}
