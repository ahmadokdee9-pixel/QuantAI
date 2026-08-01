import type {
  DecisionDomain,
  DomainClassification,
  UniversalCandidate,
  UniversalDecision,
} from "@/lib/universalDecision/types";

export type AdapterRunInput = {
  query: string;
  classification: DomainClassification;
  marketCountry?: string | null;
  currency?: string | null;
  signal?: AbortSignal;
};

export type AdapterRunResult = {
  decision: UniversalDecision;
  candidates: UniversalCandidate[];
};

export type DomainAdapter = {
  domain: DecisionDomain;
  label: string;
  detectIntent: (query: string) => Partial<DomainClassification> | null;
  normalizeQuery: (query: string, extracted?: Record<string, unknown>) => string;
  isProviderLive: (env?: NodeJS.ProcessEnv) => boolean;
  providerRequirement: string;
  run: (input: AdapterRunInput) => Promise<AdapterRunResult>;
};
