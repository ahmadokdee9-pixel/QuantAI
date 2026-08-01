import { detectDecisionChanges, confidenceTrend } from "@/lib/decisionMemory/changeDetection";
import type {
  DecisionAction,
  DecisionChange,
  DecisionMemoryEpisode,
  DecisionMemoryWriteInput,
  DecisionUpdateItem,
} from "@/lib/decisionMemory/types";
import { isBenignStorageSchemaError } from "@/lib/supabase/benignStorageError";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type DbRow = {
  id: string;
  user_id: string;
  search_query: string | null;
  product_id: string | null;
  product_link: string;
  product_title: string | null;
  merchant: string | null;
  image: string | null;
  decision: string;
  confidence: number | null;
  price: number | null;
  score: number | null;
  reasons: unknown;
  availability: string | null;
  watched: boolean;
  changes: unknown;
  created_at: string;
  domain?: string | null;
  memory_identity?: string | null;
  contextual_verb?: string | null;
  evidence?: unknown;
  source_freshness_at?: string | null;
};

const MEMORY_SELECT_BASE =
  "id, user_id, search_query, product_id, product_link, product_title, merchant, image, decision, confidence, price, score, reasons, availability, watched, changes, created_at";

const MEMORY_SELECT =
  `${MEMORY_SELECT_BASE}, domain, memory_identity, contextual_verb, evidence, source_freshness_at`;

function isMissingColumnError(message: string | undefined): boolean {
  const m = (message || "").toLowerCase();
  return m.includes("column") && (m.includes("does not exist") || m.includes("schema cache"));
}

function asReasons(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function asChanges(value: unknown): DecisionChange[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is DecisionChange => Boolean(item && typeof item === "object"));
}

function asAction(value: string): DecisionAction {
  const u = value.toUpperCase();
  if (u === "BUY" || u === "WAIT" || u === "COMPARE" || u === "AVOID") return u;
  return "COMPARE";
}

export function mapDecisionRow(row: DbRow): DecisionMemoryEpisode {
  return {
    id: row.id,
    searchQuery: row.search_query,
    productId: row.product_id,
    productLink: row.product_link,
    productTitle: row.product_title,
    merchant: row.merchant,
    image: row.image,
    decision: asAction(row.decision),
    confidence: row.confidence == null ? null : Number(row.confidence),
    price: row.price == null ? null : Number(row.price),
    score: row.score == null ? null : Number(row.score),
    reasons: asReasons(row.reasons),
    availability: row.availability,
    watched: Boolean(row.watched),
    changes: asChanges(row.changes),
    createdAt: row.created_at,
    domain: (row.domain as DecisionMemoryEpisode["domain"]) || "product",
    memoryIdentity: row.memory_identity ?? row.product_link,
    contextualVerb: row.contextual_verb ?? null,
    evidence: Array.isArray(row.evidence) ? row.evidence : [],
    sourceFreshnessAt: row.source_freshness_at ?? null,
  };
}

function enrich(episodes: DecisionMemoryEpisode[]): DecisionMemoryEpisode[] {
  const latestByLink = new Map<string, DecisionMemoryEpisode>();
  for (const ep of episodes) {
    if (!latestByLink.has(ep.productLink)) latestByLink.set(ep.productLink, ep);
  }

  return episodes.map((ep) => {
    const latest = latestByLink.get(ep.productLink);
    const prior = episodes.find(
      (row) =>
        row.productLink === ep.productLink &&
        row.id !== ep.id &&
        row.createdAt < ep.createdAt
    );
    const hist = episodes
      .filter((row) => row.productLink === ep.productLink)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    const prevConf = hist.length > 1 ? hist[1]?.confidence ?? null : prior?.confidence ?? null;
    const currConf = hist[0]?.confidence ?? ep.confidence;
    return {
      ...ep,
      currentPrice: latest?.price ?? ep.price,
      currentDecision: latest?.decision ?? ep.decision,
      currentConfidence: latest?.confidence ?? ep.confidence,
      previousConfidence: prevConf,
      scoreTrend: confidenceTrend(prevConf, currConf),
      status: ep.watched ? "Watching" : ep.changes.length > 0 ? "Updated" : "Recorded",
    };
  });
}

export async function listDecisionMemoryForUser(
  userId: string,
  opts?: { watchedOnly?: boolean; limit?: number }
): Promise<{ items: DecisionMemoryEpisode[]; configured: boolean; error?: string }> {
  if (!supabaseAdmin) return { items: [], configured: false };

  let query = supabaseAdmin
    .from("decision_memory")
    .select(MEMORY_SELECT)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(opts?.limit ?? 200);

  if (opts?.watchedOnly) query = query.eq("watched", true);

  let data: DbRow[] | null = null;
  let error: { message: string } | null = null;
  {
    const first = await query;
    data = (first.data as DbRow[] | null) ?? null;
    error = first.error;
  }
  if (error && isMissingColumnError(error.message)) {
    const fallback = supabaseAdmin
      .from("decision_memory")
      .select(MEMORY_SELECT_BASE)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(opts?.limit ?? 200);
    const retried = opts?.watchedOnly
      ? await fallback.eq("watched", true)
      : await fallback;
    data = (retried.data as DbRow[] | null) ?? null;
    error = retried.error;
  }
  if (error) {
    if (isBenignStorageSchemaError(error.message)) {
      return { items: [], configured: true };
    }
    return {
      items: [],
      configured: true,
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    };
  }

  const mapped = (data as DbRow[] | null)?.map(mapDecisionRow) ?? [];
  return { items: enrich(mapped), configured: true };
}

export async function insertDecisionMemoryEpisode(
  userId: string,
  input: DecisionMemoryWriteInput
): Promise<{ episode: DecisionMemoryEpisode | null; duplicate?: boolean; error?: string }> {
  if (!supabaseAdmin) return { episode: null, error: "STORAGE_UNAVAILABLE" };
  const link = input.productLink.trim();
  if (!link) return { episode: null, error: "Product link required" };

  const { data: priorRows, error: priorError } = await supabaseAdmin
    .from("decision_memory")
    .select(MEMORY_SELECT)
    .eq("user_id", userId)
    .eq("product_link", link)
    .order("created_at", { ascending: false })
    .limit(1);

  if (priorError && !isBenignStorageSchemaError(priorError.message)) {
    return { episode: null, error: priorError.message };
  }

  const previous = priorRows?.[0] ? mapDecisionRow(priorRows[0] as DbRow) : null;
  if (previous) {
    const ageMs = Date.now() - new Date(previous.createdAt).getTime();
    if (
      ageMs < 5 * 60 * 1000 &&
      previous.decision === input.decision &&
      Math.round(previous.confidence ?? -1) === Math.round(input.confidence ?? -2) &&
      Math.round(previous.price ?? -1) === Math.round(input.price ?? -2)
    ) {
      return { episode: previous, duplicate: true };
    }
  }

  const changes = detectDecisionChanges(previous, input);
  const watched = Boolean(input.watched) || Boolean(previous?.watched);

  const baseRow = {
    user_id: userId,
    search_query: input.searchQuery ?? null,
    product_id: input.productId ?? null,
    product_link: link,
    product_title: input.productTitle ?? null,
    merchant: input.merchant ?? null,
    image: input.image ?? null,
    decision: input.decision,
    confidence: input.confidence ?? null,
    price: input.price ?? null,
    score: input.score ?? null,
    reasons: Array.isArray(input.reasons) ? input.reasons.slice(0, 8) : [],
    availability: input.availability ?? null,
    watched,
    changes,
  };

  let data: DbRow | null = null;
  let error: { message: string } | null = null;
  {
    const first = await supabaseAdmin
      .from("decision_memory")
      .insert({
        ...baseRow,
        domain: input.domain ?? "product",
        memory_identity: input.memoryIdentity ?? link,
        contextual_verb: input.contextualVerb ?? null,
        evidence: Array.isArray(input.evidence) ? input.evidence.slice(0, 16) : [],
        source_freshness_at: input.sourceFreshnessAt ?? null,
      })
      .select(MEMORY_SELECT)
      .single();
    data = (first.data as DbRow | null) ?? null;
    error = first.error;
  }

  if (error && isMissingColumnError(error.message)) {
    const retried = await supabaseAdmin
      .from("decision_memory")
      .insert(baseRow)
      .select(MEMORY_SELECT_BASE)
      .single();
    data = (retried.data as DbRow | null) ?? null;
    error = retried.error;
  }

  if (error) {
    if (isBenignStorageSchemaError(error.message)) {
      return { episode: null, error: "SCHEMA_MISSING" };
    }
    return { episode: null, error: error.message };
  }

  // Keep score trail via price_snapshots when price present
  if (typeof input.price === "number" && input.price > 0) {
    await supabaseAdmin.from("price_snapshots").insert({
      user_id: userId,
      product_link: link,
      store: input.merchant ?? null,
      title: input.productTitle ?? null,
      price: input.price,
      currency: "EUR",
      source: "decision_memory",
    });
  }

  return { episode: mapDecisionRow(data as DbRow) };
}

export async function markDecisionWatched(
  userId: string,
  productLink: string
): Promise<{ ok: boolean; error?: string }> {
  if (!supabaseAdmin) return { ok: false, error: "STORAGE_UNAVAILABLE" };
  const link = productLink.trim();
  if (!link) return { ok: false, error: "Product link required" };

  const { error } = await supabaseAdmin
    .from("decision_memory")
    .update({ watched: true })
    .eq("user_id", userId)
    .eq("product_link", link);

  if (error) {
    if (isBenignStorageSchemaError(error.message)) return { ok: false, error: "SCHEMA_MISSING" };
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export async function listDecisionUpdatesForUser(
  userId: string
): Promise<{ items: DecisionUpdateItem[]; configured: boolean; error?: string }> {
  if (!supabaseAdmin) return { items: [], configured: false };

  const { data: visit } = await supabaseAdmin
    .from("decision_visit_state")
    .select("last_updates_seen_at, last_visit_at")
    .eq("user_id", userId)
    .maybeSingle();

  const since =
    (visit?.last_updates_seen_at as string | null) ||
    (visit?.last_visit_at as string | null) ||
    null;

  let query = supabaseAdmin
    .from("decision_memory")
    .select(MEMORY_SELECT)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(80);

  if (since) query = query.gt("created_at", since);

  const { data, error } = await query;
  if (error) {
    if (isBenignStorageSchemaError(error.message)) return { items: [], configured: true };
    return { items: [], configured: true, error: error.message };
  }

  const rows = ((data as DbRow[]) ?? []).map(mapDecisionRow);

  // Load a wider window so we can resolve previous episode per link without N+1 queries.
  const { data: contextRows } = await supabaseAdmin
    .from("decision_memory")
    .select(MEMORY_SELECT)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(240);
  const context = ((contextRows as DbRow[]) ?? []).map(mapDecisionRow);

  const items: DecisionUpdateItem[] = [];
  for (const ep of rows) {
    if (!ep.changes.length) continue;
    const previous = context.find(
      (row) =>
        row.productLink === ep.productLink &&
        row.id !== ep.id &&
        row.createdAt < ep.createdAt
    );

    items.push({
      id: ep.id,
      productLink: ep.productLink,
      productTitle: ep.productTitle,
      merchant: ep.merchant,
      summary: ep.changes.map((c) => c.label).join(" · "),
      changes: ep.changes,
      previousDecision: previous?.decision ?? null,
      currentDecision: ep.decision,
      previousConfidence: previous?.confidence ?? null,
      currentConfidence: ep.confidence,
      previousPrice: previous?.price ?? null,
      currentPrice: ep.price,
      createdAt: ep.createdAt,
      watched: ep.watched,
    });
  }

  const now = new Date().toISOString();
  await supabaseAdmin.from("decision_visit_state").upsert({
    user_id: userId,
    last_visit_at: now,
    last_updates_seen_at: now,
    updated_at: now,
  });

  return { items: items.slice(0, 40), configured: true };
}

export async function scoreHistoryForUserLink(
  userId: string,
  productLink: string
): Promise<Array<{ confidence: number; createdAt: string; decision: string }>> {
  if (!supabaseAdmin) return [];
  const { data, error } = await supabaseAdmin
    .from("decision_memory")
    .select("confidence, created_at, decision")
    .eq("user_id", userId)
    .eq("product_link", productLink)
    .not("confidence", "is", null)
    .order("created_at", { ascending: true })
    .limit(40);
  if (error || !data) return [];
  return data
    .filter((row) => row.confidence != null)
    .map((row) => ({
      confidence: Math.round(Number(row.confidence)),
      createdAt: String(row.created_at),
      decision: String(row.decision),
    }));
}
