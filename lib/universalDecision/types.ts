/**
 * Canonical Universal Decision — domain-independent decision object.
 * Public action vocabulary stays BUY | WAIT | COMPARE | AVOID.
 */

export type DecisionDomain =
  | "product"
  | "flight"
  | "hotel"
  | "subscription"
  | "software"
  | "insurance"
  | "course"
  | "device"
  | "service";

export type CanonicalDecisionAction = "BUY" | "WAIT" | "COMPARE" | "AVOID";

/** Domain-specific commitment verb shown beside the canonical action. */
export type ContextualVerb =
  | "BUY"
  | "BOOK"
  | "RESERVE"
  | "SUBSCRIBE"
  | "ENROLL"
  | "WAIT"
  | "COMPARE"
  | "AVOID";

export type EvidenceKind = "fact" | "inference" | "recommendation";

export type DecisionEvidenceItem = {
  id: string;
  label: string;
  value: string;
  kind: EvidenceKind;
  score?: number | null;
  source?: string | null;
};

export type DecisionAlternative = {
  id: string;
  title: string;
  subtitle?: string | null;
  price?: number | null;
  currency?: string | null;
  link?: string | null;
  why: string;
};

export type DecisionTiming = {
  today: string;
  thisWeek: string;
  thisMonth: string;
  waitPoints?: string[];
};

export type DecisionTrust = {
  score: number | null;
  label: string;
  notes: string[];
};

export type DecisionConstraints = {
  budgetMax?: number | null;
  hard: string[];
  soft: string[];
};

export type SourceFreshness = {
  fetchedAt: string;
  maxAgeMs: number;
  stale: boolean;
  provider: string;
  status: "fresh" | "stale" | "unavailable" | "partial";
};

export type UniversalCandidate = {
  id: string;
  domain: DecisionDomain;
  title: string;
  subtitle?: string | null;
  merchant?: string | null;
  price?: number | null;
  currency?: string | null;
  link?: string | null;
  image?: string | null;
  availability?: string | null;
  score?: number | null;
  raw?: Record<string, unknown>;
};

export type UniversalDecision = {
  version: 1;
  domain: DecisionDomain;
  action: CanonicalDecisionAction;
  contextualVerb: ContextualVerb;
  confidence: number;
  domainConfidence: number;
  executiveSummary: string;
  reasons: string[];
  risks: string[];
  alternatives: DecisionAlternative[];
  timing: DecisionTiming;
  evidence: DecisionEvidenceItem[];
  trust: DecisionTrust;
  constraints: DecisionConstraints;
  sourceFreshness: SourceFreshness;
  watchable: boolean;
  memoryIdentity: string;
  leader: UniversalCandidate | null;
  candidates: UniversalCandidate[];
  insufficientEvidence: boolean;
  clarifyingQuestion?: string | null;
  providerStatus: "live" | "unavailable" | "flagged_off" | "partial";
  query: string;
  generatedAt: string;
  /** Analyst Decision Brief — optional; attached by Decision Analyst layer. */
  analyst?: import("@/lib/decisionAnalyst/types").AnalystDecisionBrief;
};

export type DomainClassification = {
  domain: DecisionDomain;
  confidence: number;
  reasons: string[];
  needsClarification: boolean;
  clarifyingQuestion: string | null;
  normalizedQuery: string;
  extracted: Record<string, unknown>;
};
