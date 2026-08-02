/**
 * Local Mission store — guest / offline fallback.
 * Server is source of truth when signed in.
 */

import { listLocalDecisionMemory } from "@/lib/decisionMemory/clientMemory";
import { enrichMission } from "@/lib/missions/overlay";
import { buildMissionDashboard } from "@/lib/missions/intelligence";
import { getMissionTemplate } from "@/lib/missions/templates";
import type {
  Mission,
  MissionCreateInput,
  MissionDecisionItem,
  MissionDecisionStatus,
  MissionDecisionWrite,
  MissionPriority,
  MissionStatus,
} from "@/lib/missions/types";
import { MISSIONS_STORAGE_KEY } from "@/lib/missions/types";

type LocalStore = {
  version: 1;
  missions: Mission[];
  updatedAt: string;
};

function emptyStore(): LocalStore {
  return { version: 1, missions: [], updatedAt: new Date().toISOString() };
}

function readStore(): LocalStore {
  if (typeof window === "undefined") return emptyStore();
  try {
    const raw = window.localStorage.getItem(MISSIONS_STORAGE_KEY);
    if (!raw) return emptyStore();
    const parsed = JSON.parse(raw) as LocalStore;
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.missions)) {
      return emptyStore();
    }
    return parsed;
  } catch {
    return emptyStore();
  }
}

function writeStore(store: LocalStore): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    MISSIONS_STORAGE_KEY,
    JSON.stringify({ ...store, updatedAt: new Date().toISOString() })
  );
}

function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `m_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function seedDecisions(
  missionId: string,
  seeds: MissionDecisionWrite[]
): MissionDecisionItem[] {
  const now = new Date().toISOString();
  return seeds.map((s, i) => ({
    id: uid(),
    missionId,
    groupKey: s.groupKey,
    groupLabel: s.groupLabel,
    title: s.title,
    domain: s.domain,
    status: "pending" as MissionDecisionStatus,
    priority: (s.priority ?? "important") as MissionPriority,
    searchQuery: s.searchQuery ?? null,
    productLink: null,
    decisionId: null,
    memoryIdentity: null,
    sortOrder: s.sortOrder ?? i + 1,
    notes: null,
    createdAt: now,
    updatedAt: now,
    living: null,
  }));
}

export function listLocalMissionsDashboard() {
  const store = readStore();
  const episodes = listLocalDecisionMemory();
  const active = store.missions.filter((m) => m.status !== "archived");
  const enriched = active.map((m) => enrichMission(m, episodes));
  return buildMissionDashboard(enriched);
}

export function getLocalMission(missionId: string) {
  const store = readStore();
  const mission = store.missions.find((m) => m.id === missionId);
  if (!mission) return null;
  return enrichMission(mission, listLocalDecisionMemory());
}

export function createLocalMission(
  input: MissionCreateInput & { decisions?: MissionDecisionWrite[] }
): Mission {
  const template = input.templateId ? getMissionTemplate(input.templateId) : null;
  const now = new Date().toISOString();
  const id = uid();
  const seeds =
    input.decisions?.length
      ? input.decisions
      : template?.decisions || [];

  const mission: Mission = {
    id,
    title: (input.title || template?.title || "Untitled mission").trim(),
    goal: input.goal ?? template?.goal ?? null,
    budget: input.budget ?? template?.suggestedBudget ?? null,
    deadline: input.deadline ?? null,
    priority: input.priority ?? "important",
    status: "active",
    templateId: input.templateId ?? null,
    currency: input.currency ?? "EUR",
    createdAt: now,
    updatedAt: now,
    decisions: seedDecisions(id, seeds),
  };

  const store = readStore();
  store.missions = [mission, ...store.missions];
  writeStore(store);
  return mission;
}

export function updateLocalMission(
  missionId: string,
  patch: Partial<{
    title: string;
    goal: string | null;
    budget: number | null;
    deadline: string | null;
    priority: MissionPriority;
    status: MissionStatus;
  }>
): Mission | null {
  const store = readStore();
  const idx = store.missions.findIndex((m) => m.id === missionId);
  if (idx < 0) return null;
  const prev = store.missions[idx];
  const next: Mission = {
    ...prev,
    ...patch,
    title: patch.title != null ? patch.title.trim() : prev.title,
    updatedAt: new Date().toISOString(),
  };
  store.missions[idx] = next;
  writeStore(store);
  return next;
}

export function updateLocalMissionDecision(
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
): MissionDecisionItem | null {
  const store = readStore();
  for (let i = 0; i < store.missions.length; i++) {
    const m = store.missions[i];
    const di = m.decisions.findIndex((d) => d.id === decisionId);
    if (di < 0) continue;
    const prev = m.decisions[di];
    const next: MissionDecisionItem = {
      ...prev,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    const decisions = [...m.decisions];
    decisions[di] = next;
    store.missions[i] = {
      ...m,
      decisions,
      updatedAt: new Date().toISOString(),
    };
    writeStore(store);
    return next;
  }
  return null;
}

export function addLocalMissionDecision(
  missionId: string,
  input: MissionDecisionWrite
): MissionDecisionItem | null {
  const store = readStore();
  const idx = store.missions.findIndex((m) => m.id === missionId);
  if (idx < 0) return null;
  const m = store.missions[idx];
  const now = new Date().toISOString();
  const decision: MissionDecisionItem = {
    id: uid(),
    missionId,
    groupKey: input.groupKey,
    groupLabel: input.groupLabel,
    title: input.title.trim(),
    domain: input.domain,
    status: "pending",
    priority: input.priority ?? "important",
    searchQuery: input.searchQuery ?? null,
    productLink: null,
    decisionId: null,
    memoryIdentity: null,
    sortOrder: input.sortOrder ?? m.decisions.length + 1,
    notes: null,
    createdAt: now,
    updatedAt: now,
    living: null,
  };
  store.missions[idx] = {
    ...m,
    decisions: [...m.decisions, decision],
    updatedAt: now,
  };
  writeStore(store);
  return decision;
}
