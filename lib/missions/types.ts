/**
 * QuantAI Decision Agent — Missions over Living Decisions.
 */

import type { DecisionDomain } from "@/lib/universalDecision/types";
import type { DecisionAction } from "@/lib/decisionMemory/types";

/** Future-ready domains (engine maps to live adapters when available). */
export type MissionDomain =
  | DecisionDomain
  | "housing"
  | "utilities"
  | "healthcare"
  | "car"
  | "banking";

export type MissionStatus = "draft" | "active" | "paused" | "completed" | "archived";
export type MissionPriority = "critical" | "important" | "informational";
export type MissionDecisionStatus =
  | "pending"
  | "active"
  | "completed"
  | "skipped"
  | "blocked";

export type MissionDecisionItem = {
  id: string;
  missionId: string;
  groupKey: string;
  groupLabel: string;
  title: string;
  domain: MissionDomain;
  status: MissionDecisionStatus;
  priority: MissionPriority;
  searchQuery: string | null;
  productLink: string | null;
  decisionId: string | null;
  memoryIdentity: string | null;
  sortOrder: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  /** Live Living Decision overlay (null until linked/run). */
  living?: {
    action: DecisionAction | null;
    confidence: number | null;
    price: number | null;
    changesCount: number;
    watched: boolean;
    lastUpdatedAt: string | null;
  } | null;
};

export type Mission = {
  id: string;
  title: string;
  goal: string | null;
  budget: number | null;
  deadline: string | null;
  priority: MissionPriority;
  status: MissionStatus;
  templateId: string | null;
  currency: string;
  createdAt: string;
  updatedAt: string;
  decisions: MissionDecisionItem[];
};

export type MissionIntelligence = {
  completionPct: number;
  decisionCount: number;
  completedCount: number;
  pendingCount: number;
  activeCount: number;
  criticalAlerts: number;
  moneySpentTracked: number;
  moneyRemaining: number | null;
  estimatedSavings: number | null;
  overallConfidence: number | null;
  missionHealth: "strong" | "stable" | "at_risk" | "unknown";
  highestRiskDecision: { id: string; title: string; reason: string } | null;
  bestOpportunityToday: { id: string; title: string; reason: string } | null;
  mostUrgentAction: { id: string; title: string; reason: string } | null;
  todaysOpportunities: Array<{ id: string; title: string; reason: string }>;
  upcomingDecisions: Array<{ id: string; title: string; domain: MissionDomain }>;
  recentChanges: Array<{ id: string; title: string; summary: string; at: string }>;
};

export type MissionDashboard = {
  missions: Array<Mission & { intelligence: MissionIntelligence }>;
  totals: {
    activeMissions: number;
    completionAvg: number;
    moneySaved: number;
    moneyRemaining: number | null;
    pendingDecisions: number;
    completedDecisions: number;
    criticalChanges: number;
  };
};

export type MissionCreateInput = {
  title: string;
  goal?: string | null;
  budget?: number | null;
  deadline?: string | null;
  priority?: MissionPriority;
  templateId?: string | null;
  currency?: string;
};

export type MissionDecisionWrite = {
  groupKey: string;
  groupLabel: string;
  title: string;
  domain: MissionDomain;
  priority?: MissionPriority;
  searchQuery?: string | null;
  sortOrder?: number;
};

export const MISSIONS_STORAGE_KEY = "quantai-missions-v1";
