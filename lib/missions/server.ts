/**
 * Server-side Mission persistence (Supabase) + Living Decision overlays.
 */

import { isBenignStorageSchemaError } from "@/lib/supabase/benignStorageError";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { listDecisionMemoryForUser } from "@/lib/decisionMemory/server";
import { enrichMission } from "@/lib/missions/overlay";
import { getMissionTemplate } from "@/lib/missions/templates";
import { buildMissionDashboard } from "@/lib/missions/intelligence";
import type {
  Mission,
  MissionCreateInput,
  MissionDecisionItem,
  MissionDecisionStatus,
  MissionDecisionWrite,
  MissionDomain,
  MissionPriority,
  MissionStatus,
} from "@/lib/missions/types";

type MissionRow = {
  id: string;
  user_id: string;
  title: string;
  goal: string | null;
  budget: number | string | null;
  deadline: string | null;
  priority: string;
  status: string;
  template_id: string | null;
  currency: string;
  created_at: string;
  updated_at: string;
};

type DecisionRow = {
  id: string;
  mission_id: string;
  user_id: string;
  group_key: string;
  group_label: string;
  title: string;
  domain: string;
  status: string;
  priority: string;
  search_query: string | null;
  product_link: string | null;
  decision_id: string | null;
  memory_identity: string | null;
  sort_order: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

function mapDecision(row: DecisionRow): MissionDecisionItem {
  return {
    id: row.id,
    missionId: row.mission_id,
    groupKey: row.group_key,
    groupLabel: row.group_label,
    title: row.title,
    domain: (row.domain || "product") as MissionDomain,
    status: (row.status || "pending") as MissionDecisionStatus,
    priority: (row.priority || "important") as MissionPriority,
    searchQuery: row.search_query,
    productLink: row.product_link,
    decisionId: row.decision_id,
    memoryIdentity: row.memory_identity,
    sortOrder: row.sort_order ?? 0,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    living: null,
  };
}

function mapMission(row: MissionRow, decisions: MissionDecisionItem[]): Mission {
  return {
    id: row.id,
    title: row.title,
    goal: row.goal,
    budget: row.budget == null ? null : Number(row.budget),
    deadline: row.deadline,
    priority: (row.priority || "important") as MissionPriority,
    status: (row.status || "active") as MissionStatus,
    templateId: row.template_id,
    currency: row.currency || "EUR",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    decisions: decisions.sort((a, b) => a.sortOrder - b.sortOrder),
  };
}

async function loadDecisionsForMissions(
  userId: string,
  missionIds: string[]
): Promise<Map<string, MissionDecisionItem[]>> {
  const map = new Map<string, MissionDecisionItem[]>();
  if (!supabaseAdmin || missionIds.length === 0) return map;

  const { data, error } = await supabaseAdmin
    .from("mission_decisions")
    .select("*")
    .eq("user_id", userId)
    .in("mission_id", missionIds)
    .order("sort_order", { ascending: true });

  if (error) {
    if (!isBenignStorageSchemaError(error.message)) {
      console.warn("[missions] loadDecisions", error.message);
    }
    return map;
  }

  for (const row of (data || []) as DecisionRow[]) {
    const list = map.get(row.mission_id) || [];
    list.push(mapDecision(row));
    map.set(row.mission_id, list);
  }
  return map;
}

export async function listMissionsForUser(userId: string): Promise<{
  dashboard: ReturnType<typeof buildMissionDashboard>;
  configured: boolean;
  error?: string;
}> {
  if (!supabaseAdmin) {
    return {
      dashboard: buildMissionDashboard([]),
      configured: false,
    };
  }

  const { data, error } = await supabaseAdmin
    .from("missions")
    .select("*")
    .eq("user_id", userId)
    .neq("status", "archived")
    .order("updated_at", { ascending: false })
    .limit(40);

  if (error) {
    if (isBenignStorageSchemaError(error.message)) {
      return { dashboard: buildMissionDashboard([]), configured: true };
    }
    return {
      dashboard: buildMissionDashboard([]),
      configured: true,
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    };
  }

  const rows = (data || []) as MissionRow[];
  const decisionMap = await loadDecisionsForMissions(
    userId,
    rows.map((r) => r.id)
  );
  const memory = await listDecisionMemoryForUser(userId, { limit: 240 });
  const episodes = memory.items || [];

  const enriched = rows.map((row) =>
    enrichMission(mapMission(row, decisionMap.get(row.id) || []), episodes)
  );

  return {
    dashboard: buildMissionDashboard(enriched),
    configured: true,
  };
}

export async function getMissionForUser(
  userId: string,
  missionId: string
): Promise<{ mission: (Mission & { intelligence: ReturnType<typeof enrichMission>["intelligence"] }) | null; configured: boolean; error?: string }> {
  if (!supabaseAdmin) return { mission: null, configured: false };

  const { data, error } = await supabaseAdmin
    .from("missions")
    .select("*")
    .eq("user_id", userId)
    .eq("id", missionId)
    .maybeSingle();

  if (error) {
    if (isBenignStorageSchemaError(error.message)) {
      return { mission: null, configured: true };
    }
    return { mission: null, configured: true, error: error.message };
  }
  if (!data) return { mission: null, configured: true };

  const decisionMap = await loadDecisionsForMissions(userId, [missionId]);
  const memory = await listDecisionMemoryForUser(userId, { limit: 240 });
  const mission = enrichMission(
    mapMission(data as MissionRow, decisionMap.get(missionId) || []),
    memory.items || []
  );
  return { mission, configured: true };
}

export async function createMissionForUser(
  userId: string,
  input: MissionCreateInput & { decisions?: MissionDecisionWrite[] }
): Promise<{ mission: Mission | null; error?: string }> {
  if (!supabaseAdmin) return { mission: null, error: "STORAGE_UNAVAILABLE" };

  const template = input.templateId ? getMissionTemplate(input.templateId) : null;
  const title = (input.title || template?.title || "").trim();
  if (!title) return { mission: null, error: "Title required" };

  const now = new Date().toISOString();
  const { data, error } = await supabaseAdmin
    .from("missions")
    .insert({
      user_id: userId,
      title,
      goal: input.goal ?? template?.goal ?? null,
      budget: input.budget ?? template?.suggestedBudget ?? null,
      deadline: input.deadline ?? null,
      priority: input.priority ?? "important",
      status: "active",
      template_id: input.templateId ?? null,
      currency: input.currency ?? "EUR",
      updated_at: now,
    })
    .select("*")
    .single();

  if (error || !data) {
    if (error && isBenignStorageSchemaError(error.message)) {
      return { mission: null, error: "SCHEMA_MISSING" };
    }
    return { mission: null, error: error?.message || "Create failed" };
  }

  const missionRow = data as MissionRow;
  const seeds: MissionDecisionWrite[] =
    input.decisions?.length
      ? input.decisions
      : template?.decisions || [];

  let decisions: MissionDecisionItem[] = [];
  if (seeds.length) {
    const rows = seeds.map((s, i) => ({
      mission_id: missionRow.id,
      user_id: userId,
      group_key: s.groupKey,
      group_label: s.groupLabel,
      title: s.title,
      domain: s.domain,
      status: "pending",
      priority: s.priority ?? "important",
      search_query: s.searchQuery ?? null,
      sort_order: s.sortOrder ?? i + 1,
      updated_at: now,
    }));

    const inserted = await supabaseAdmin.from("mission_decisions").insert(rows).select("*");
    if (!inserted.error && inserted.data) {
      decisions = (inserted.data as DecisionRow[]).map(mapDecision);
    }
  }

  return { mission: mapMission(missionRow, decisions) };
}

export async function updateMissionForUser(
  userId: string,
  missionId: string,
  patch: Partial<{
    title: string;
    goal: string | null;
    budget: number | null;
    deadline: string | null;
    priority: MissionPriority;
    status: MissionStatus;
  }>
): Promise<{ mission: Mission | null; error?: string }> {
  if (!supabaseAdmin) return { mission: null, error: "STORAGE_UNAVAILABLE" };

  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.title != null) payload.title = patch.title.trim();
  if (patch.goal !== undefined) payload.goal = patch.goal;
  if (patch.budget !== undefined) payload.budget = patch.budget;
  if (patch.deadline !== undefined) payload.deadline = patch.deadline;
  if (patch.priority != null) payload.priority = patch.priority;
  if (patch.status != null) payload.status = patch.status;

  const { data, error } = await supabaseAdmin
    .from("missions")
    .update(payload)
    .eq("user_id", userId)
    .eq("id", missionId)
    .select("*")
    .maybeSingle();

  if (error) {
    if (isBenignStorageSchemaError(error.message)) {
      return { mission: null, error: "SCHEMA_MISSING" };
    }
    return { mission: null, error: error.message };
  }
  if (!data) return { mission: null, error: "Not found" };

  const decisionMap = await loadDecisionsForMissions(userId, [missionId]);
  return {
    mission: mapMission(data as MissionRow, decisionMap.get(missionId) || []),
  };
}

export async function updateMissionDecisionForUser(
  userId: string,
  decisionId: string,
  patch: Partial<{
    status: MissionDecisionStatus;
    priority: MissionPriority;
    notes: string | null;
    productLink: string | null;
    decisionId: string | null;
    memoryIdentity: string | null;
    searchQuery: string | null;
  }>
): Promise<{ decision: MissionDecisionItem | null; error?: string }> {
  if (!supabaseAdmin) return { decision: null, error: "STORAGE_UNAVAILABLE" };

  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.status != null) payload.status = patch.status;
  if (patch.priority != null) payload.priority = patch.priority;
  if (patch.notes !== undefined) payload.notes = patch.notes;
  if (patch.productLink !== undefined) payload.product_link = patch.productLink;
  if (patch.decisionId !== undefined) payload.decision_id = patch.decisionId;
  if (patch.memoryIdentity !== undefined) payload.memory_identity = patch.memoryIdentity;
  if (patch.searchQuery !== undefined) payload.search_query = patch.searchQuery;

  const { data, error } = await supabaseAdmin
    .from("mission_decisions")
    .update(payload)
    .eq("user_id", userId)
    .eq("id", decisionId)
    .select("*")
    .maybeSingle();

  if (error) {
    if (isBenignStorageSchemaError(error.message)) {
      return { decision: null, error: "SCHEMA_MISSING" };
    }
    return { decision: null, error: error.message };
  }
  if (!data) return { decision: null, error: "Not found" };
  return { decision: mapDecision(data as DecisionRow) };
}

export async function addMissionDecisionForUser(
  userId: string,
  missionId: string,
  input: MissionDecisionWrite
): Promise<{ decision: MissionDecisionItem | null; error?: string }> {
  if (!supabaseAdmin) return { decision: null, error: "STORAGE_UNAVAILABLE" };

  const { data: mission } = await supabaseAdmin
    .from("missions")
    .select("id")
    .eq("user_id", userId)
    .eq("id", missionId)
    .maybeSingle();
  if (!mission) return { decision: null, error: "Mission not found" };

  const { count } = await supabaseAdmin
    .from("mission_decisions")
    .select("id", { count: "exact", head: true })
    .eq("mission_id", missionId);

  const sortOrder = input.sortOrder ?? (count ?? 0) + 1;
  const now = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from("mission_decisions")
    .insert({
      mission_id: missionId,
      user_id: userId,
      group_key: input.groupKey,
      group_label: input.groupLabel,
      title: input.title.trim(),
      domain: input.domain,
      status: "pending",
      priority: input.priority ?? "important",
      search_query: input.searchQuery ?? null,
      sort_order: sortOrder,
      updated_at: now,
    })
    .select("*")
    .single();

  if (error || !data) {
    return { decision: null, error: error?.message || "Insert failed" };
  }

  await supabaseAdmin
    .from("missions")
    .update({ updated_at: now })
    .eq("id", missionId)
    .eq("user_id", userId);

  return { decision: mapDecision(data as DecisionRow) };
}
