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
import { resolveLivingDecisionId, resolveThreadKey } from "@/lib/livingDecision/identity";
import { prepareLivingDecisionUpdate } from "@/lib/livingDecision/updateEngine";

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
  decision_id?: string | null;
  rating?: number | null;
  provider?: string | null;
  stock_state?: string | null;
};

const MEMORY_SELECT_BASE =
  "id, user_id, search_query, product_id, product_link, product_title, merchant, image, decision, confidence, price, score, reasons, availability, watched, changes, created_at";

const MEMORY_SELECT_UNIVERSAL =
  `${MEMORY_SELECT_BASE}, domain, memory_identity, contextual_verb, evidence, source_freshness_at`;

const MEMORY_SELECT =
  `${MEMORY_SELECT_UNIVERSAL}, decision_id, rating, provider, stock_state`;

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

function threadKey(ep: DecisionMemoryEpisode): string {
  return (
    ep.decisionId ||
    resolveThreadKey({
      memoryIdentity: ep.memoryIdentity,
      productLink: ep.productLink,
      domain: ep.domain,
    })
  );
}

export function mapDecisionRow(row: DbRow): DecisionMemoryEpisode {
  return {
    id: row.id,
    decisionId: row.decision_id ?? null,
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
    rating: row.rating == null ? null : Number(row.rating),
    provider: row.provider ?? row.merchant ?? null,
    stockState: row.stock_state ?? null,
  };
}

function enrich(episodes: DecisionMemoryEpisode[]): DecisionMemoryEpisode[] {
  const latestByThread = new Map<string, DecisionMemoryEpisode>();
  for (const ep of episodes) {
    const key = threadKey(ep);
    if (!latestByThread.has(key)) latestByThread.set(key, ep);
  }

  return episodes.map((ep) => {
    const key = threadKey(ep);
    const latest = latestByThread.get(key);
    const hist = episodes
      .filter((row) => threadKey(row) === key)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    const prevConf = hist.length > 1 ? hist[1]?.confidence ?? null : null;
    const currConf = hist[0]?.confidence ?? ep.confidence;
    return {
      ...ep,
      decisionId: ep.decisionId || key,
      currentPrice: latest?.price ?? ep.price,
      currentDecision: latest?.decision ?? ep.decision,
      currentConfidence: latest?.confidence ?? ep.confidence,
      previousConfidence: prevConf,
      scoreTrend: confidenceTrend(prevConf, currConf),
      status: ep.watched ? "Watching" : ep.changes.length > 0 ? "Living" : "Recorded",
    };
  });
}

async function selectMemory(
  userId: string,
  opts?: { watchedOnly?: boolean; limit?: number; link?: string; decisionId?: string }
) {
  if (!supabaseAdmin) return { data: [] as DbRow[], error: null as { message: string } | null };

  let query = supabaseAdmin
    .from("decision_memory")
    .select(MEMORY_SELECT)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(opts?.limit ?? 200);

  if (opts?.watchedOnly) query = query.eq("watched", true);
  if (opts?.link) query = query.eq("product_link", opts.link);
  if (opts?.decisionId) query = query.eq("decision_id", opts.decisionId);

  let data: DbRow[] | null = null;
  let error: { message: string } | null = null;
  {
    const first = await query;
    data = (first.data as DbRow[] | null) ?? null;
    error = first.error;
  }

  if (error && isMissingColumnError(error.message)) {
    let fallback = supabaseAdmin
      .from("decision_memory")
      .select(MEMORY_SELECT_UNIVERSAL)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(opts?.limit ?? 200);
    if (opts?.watchedOnly) fallback = fallback.eq("watched", true);
    if (opts?.link) fallback = fallback.eq("product_link", opts.link);
    const retried = await fallback;
    data = (retried.data as DbRow[] | null) ?? null;
    error = retried.error;
  }

  if (error && isMissingColumnError(error.message)) {
    let fallback = supabaseAdmin
      .from("decision_memory")
      .select(MEMORY_SELECT_BASE)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(opts?.limit ?? 200);
    if (opts?.watchedOnly) fallback = fallback.eq("watched", true);
    if (opts?.link) fallback = fallback.eq("product_link", opts.link);
    const retried = await fallback;
    data = (retried.data as DbRow[] | null) ?? null;
    error = retried.error;
  }

  return { data: data ?? [], error };
}

export async function listDecisionMemoryForUser(
  userId: string,
  opts?: { watchedOnly?: boolean; limit?: number }
): Promise<{ items: DecisionMemoryEpisode[]; configured: boolean; error?: string }> {
  if (!supabaseAdmin) return { items: [], configured: false };

  const { data, error } = await selectMemory(userId, opts);
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

  return { items: enrich(data.map(mapDecisionRow)), configured: true };
}

export async function listEpisodesForLivingDecision(
  userId: string,
  decisionIdOrLink: string
): Promise<DecisionMemoryEpisode[]> {
  if (!supabaseAdmin) return [];
  const key = decisionIdOrLink.trim();
  if (!key) return [];

  const byId = await selectMemory(userId, { decisionId: key, limit: 80 });
  if (!byId.error && byId.data.length) {
    return enrich(byId.data.map(mapDecisionRow)).sort((a, b) =>
      a.createdAt < b.createdAt ? -1 : 1
    );
  }

  const byLink = await selectMemory(userId, { link: key, limit: 80 });
  if (byLink.error || !byLink.data.length) return [];
  return enrich(byLink.data.map(mapDecisionRow)).sort((a, b) =>
    a.createdAt < b.createdAt ? -1 : 1
  );
}

export async function insertDecisionMemoryEpisode(
  userId: string,
  input: DecisionMemoryWriteInput
): Promise<{ episode: DecisionMemoryEpisode | null; duplicate?: boolean; error?: string }> {
  if (!supabaseAdmin) return { episode: null, error: "STORAGE_UNAVAILABLE" };
  const link = input.productLink.trim();
  if (!link) return { episode: null, error: "Product link required" };

  const memoryIdentity = resolveThreadKey({
    memoryIdentity: input.memoryIdentity,
    productLink: link,
    domain: input.domain,
  });

  let previous: DecisionMemoryEpisode | null = null;
  {
    const byLink = await supabaseAdmin
      .from("decision_memory")
      .select(MEMORY_SELECT)
      .eq("user_id", userId)
      .eq("product_link", link)
      .order("created_at", { ascending: false })
      .limit(1);

    if (!byLink.error && byLink.data?.[0]) {
      previous = mapDecisionRow(byLink.data[0] as DbRow);
    } else if (byLink.error && isMissingColumnError(byLink.error.message)) {
      const fallback = await supabaseAdmin
        .from("decision_memory")
        .select(MEMORY_SELECT_BASE)
        .eq("user_id", userId)
        .eq("product_link", link)
        .order("created_at", { ascending: false })
        .limit(1);
      if (fallback.data?.[0]) previous = mapDecisionRow(fallback.data[0] as DbRow);
    }

    if (!previous && memoryIdentity && memoryIdentity !== link) {
      const byIdentity = await supabaseAdmin
        .from("decision_memory")
        .select(MEMORY_SELECT)
        .eq("user_id", userId)
        .eq("memory_identity", memoryIdentity)
        .order("created_at", { ascending: false })
        .limit(1);
      if (!byIdentity.error && byIdentity.data?.[0]) {
        previous = mapDecisionRow(byIdentity.data[0] as DbRow);
      }
    }
  }

  const prepared = prepareLivingDecisionUpdate({
    input: {
      domain: input.domain || "product",
      memoryIdentity,
      productLink: link,
      productTitle: input.productTitle,
      merchant: input.merchant,
      provider: input.provider ?? input.merchant,
      image: input.image,
      decision: input.decision,
      confidence: input.confidence,
      price: input.price,
      rating: input.rating,
      score: input.score,
      reasons: input.reasons,
      availability: input.availability,
      stockState: input.stockState,
      evidence: input.evidence,
      sourceFreshnessAt: input.sourceFreshnessAt,
      searchQuery: input.searchQuery,
      watched: input.watched,
      betterAlternativeTitle: input.betterAlternativeTitle,
    },
    previous: previous
      ? {
          decisionId: previous.decisionId,
          decision: previous.decision,
          confidence: previous.confidence,
          price: previous.price,
          availability: previous.availability,
          rating: previous.rating,
          stockState: previous.stockState,
          merchant: previous.merchant,
          provider: previous.provider,
          domain: previous.domain,
        }
      : null,
    userScope: userId,
  });

  if (previous) {
    const ageMs = Date.now() - new Date(previous.createdAt).getTime();
    if (
      ageMs < 5 * 60 * 1000 &&
      previous.decision === prepared.write.decision &&
      Math.round(previous.confidence ?? -1) === Math.round(prepared.write.confidence ?? -2) &&
      Math.round(previous.price ?? -1) === Math.round(prepared.write.price ?? -2) &&
      prepared.changes.length === 0
    ) {
      return { episode: previous, duplicate: true };
    }
  }

  const changes =
    Array.isArray(input.changes) && input.changes.length
      ? input.changes
      : prepared.changes.length
        ? prepared.changes
        : detectDecisionChanges(previous, prepared.write);

  const watched = Boolean(prepared.write.watched) || Boolean(previous?.watched);
  const decisionId =
    prepared.decisionId ||
    resolveLivingDecisionId({
      existingDecisionId: previous?.decisionId,
      userScope: userId,
      memoryIdentity,
      productLink: link,
      domain: input.domain,
    });

  const baseRow = {
    user_id: userId,
    search_query: prepared.write.searchQuery ?? null,
    product_id: prepared.write.productId ?? null,
    product_link: link,
    product_title: prepared.write.productTitle ?? null,
    merchant: prepared.write.merchant ?? null,
    image: prepared.write.image ?? null,
    decision: prepared.write.decision,
    confidence: prepared.write.confidence ?? null,
    price: prepared.write.price ?? null,
    score: prepared.write.score ?? null,
    reasons: Array.isArray(prepared.write.reasons) ? prepared.write.reasons.slice(0, 8) : [],
    availability: prepared.write.availability ?? null,
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
        domain: prepared.write.domain ?? "product",
        memory_identity: memoryIdentity,
        contextual_verb: input.contextualVerb ?? null,
        evidence: Array.isArray(prepared.write.evidence)
          ? prepared.write.evidence.slice(0, 16)
          : [],
        source_freshness_at: prepared.write.sourceFreshnessAt ?? null,
        decision_id: decisionId,
        rating: prepared.write.rating ?? null,
        provider: prepared.write.provider ?? null,
        stock_state: prepared.write.stockState ?? null,
      })
      .select(MEMORY_SELECT)
      .single();
    data = (first.data as DbRow | null) ?? null;
    error = first.error;
  }

  if (error && isMissingColumnError(error.message)) {
    const mid = await supabaseAdmin
      .from("decision_memory")
      .insert({
        ...baseRow,
        domain: prepared.write.domain ?? "product",
        memory_identity: memoryIdentity,
        contextual_verb: input.contextualVerb ?? null,
        evidence: Array.isArray(prepared.write.evidence)
          ? prepared.write.evidence.slice(0, 16)
          : [],
        source_freshness_at: prepared.write.sourceFreshnessAt ?? null,
      })
      .select(MEMORY_SELECT_UNIVERSAL)
      .single();
    data = (mid.data as DbRow | null) ?? null;
    error = mid.error;
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

  if (typeof prepared.write.price === "number" && prepared.write.price > 0) {
    await supabaseAdmin.from("price_snapshots").insert({
      user_id: userId,
      product_link: link,
      store: prepared.write.merchant ?? null,
      title: prepared.write.productTitle ?? null,
      price: prepared.write.price,
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

  const byLink = await supabaseAdmin
    .from("decision_memory")
    .update({ watched: true })
    .eq("user_id", userId)
    .eq("product_link", link);

  if (byLink.error) {
    if (isBenignStorageSchemaError(byLink.error.message)) {
      return { ok: false, error: "SCHEMA_MISSING" };
    }
    return { ok: false, error: byLink.error.message };
  }

  // Also mark identity / decision-id matches when columns exist (best-effort).
  await supabaseAdmin
    .from("decision_memory")
    .update({ watched: true })
    .eq("user_id", userId)
    .eq("memory_identity", link);
  await supabaseAdmin
    .from("decision_memory")
    .update({ watched: true })
    .eq("user_id", userId)
    .eq("decision_id", link);

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

  const recent = await selectMemory(userId, { limit: 80 });
  if (recent.error) {
    if (isBenignStorageSchemaError(recent.error.message)) return { items: [], configured: true };
    return { items: [], configured: true, error: recent.error.message };
  }

  const rows = recent.data
    .map(mapDecisionRow)
    .filter((ep) => !since || ep.createdAt > since);

  const context = (await selectMemory(userId, { limit: 240 })).data.map(mapDecisionRow);

  const items: DecisionUpdateItem[] = [];
  for (const ep of rows) {
    if (!ep.changes.length) continue;
    const previous = context.find(
      (row) =>
        threadKey(row) === threadKey(ep) &&
        row.id !== ep.id &&
        row.createdAt < ep.createdAt
    );

    items.push({
      id: ep.id,
      decisionId: ep.decisionId,
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
      domain: ep.domain,
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
): Promise<Array<{ confidence: number; createdAt: string; decision: string; decisionId?: string | null }>> {
  if (!supabaseAdmin) return [];
  const episodes = await listEpisodesForLivingDecision(userId, productLink);
  return episodes
    .filter((ep) => ep.confidence != null)
    .map((ep) => ({
      confidence: Math.round(Number(ep.confidence)),
      createdAt: ep.createdAt,
      decision: ep.decision,
      decisionId: ep.decisionId,
    }));
}
