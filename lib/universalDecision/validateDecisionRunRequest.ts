import type { DecisionDomain } from "@/lib/universalDecision/types";

/** Domains accepted by /api/decision/run (live adapters only). */
export const DECISION_RUN_DOMAINS = [
  "product",
  "flight",
  "hotel",
  "subscription",
] as const satisfies readonly DecisionDomain[];

export type DecisionRunDomain = (typeof DECISION_RUN_DOMAINS)[number];

export type DecisionRunRequestBody = {
  query?: unknown;
  forcedDomain?: unknown;
  marketCountry?: unknown;
  currency?: unknown;
};

export type ValidatedDecisionRunRequest = {
  query: string;
  forcedDomain: DecisionRunDomain | null;
  marketCountry: string | null;
  currency: string | null;
};

export type DecisionRunValidationFailure = {
  ok: false;
  status: 400;
  error: string;
  code: string;
};

export type DecisionRunValidationSuccess = {
  ok: true;
  value: ValidatedDecisionRunRequest;
};

export type DecisionRunValidationResult =
  | DecisionRunValidationSuccess
  | DecisionRunValidationFailure;

const MAX_QUERY_LEN = 220;

/** HTML / script / event-handler injection. */
const HOSTILE_MARKUP =
  /<\s*script\b|<\s*img\b|<\s*svg\b|<\s*iframe\b|<\s*object\b|<\s*embed\b|onerror\s*=|onload\s*=|javascript\s*:|data\s*:\s*text\/html/i;

/** Prompt-injection / instruction-override attempts that must not reach routing. */
const HOSTILE_PROMPT =
  /ignore\s+(all\s+)?(previous|prior|above)\s+instructions|reveal\s+(the\s+)?(system\s+)?prompt|system\s+prompt|you\s+are\s+dan\b|jailbreak|api\s*keys?/i;

function isDecisionRunDomain(v: string): v is DecisionRunDomain {
  return (DECISION_RUN_DOMAINS as readonly string[]).includes(v);
}

function optionalString(
  v: unknown,
  field: string,
  maxLen: number
): { ok: true; value: string | null } | DecisionRunValidationFailure {
  if (v == null) return { ok: true, value: null };
  if (typeof v !== "string") {
    return { ok: false, status: 400, error: `${field} must be a string`, code: "INVALID_FIELD" };
  }
  const t = v.trim();
  if (!t) return { ok: true, value: null };
  if (t.length > maxLen) {
    return { ok: false, status: 400, error: `${field} too long`, code: "FIELD_TOO_LONG" };
  }
  return { ok: true, value: t };
}

/**
 * Strict request validation for /api/decision/run.
 * Fail closed on malformed, hostile, or unsupported domain input.
 */
export function validateDecisionRunRequest(
  body: unknown
): DecisionRunValidationResult {
  if (body == null || typeof body !== "object" || Array.isArray(body)) {
    return {
      ok: false,
      status: 400,
      error: "Request body must be a JSON object",
      code: "INVALID_BODY",
    };
  }

  const raw = body as DecisionRunRequestBody;

  if (typeof raw.query !== "string") {
    return {
      ok: false,
      status: 400,
      error: "query required",
      code: "QUERY_REQUIRED",
    };
  }

  const query = raw.query.trim();
  if (!query) {
    return {
      ok: false,
      status: 400,
      error: "query required",
      code: "QUERY_REQUIRED",
    };
  }

  if (query.length > MAX_QUERY_LEN) {
    return {
      ok: false,
      status: 400,
      error: "query too long",
      code: "QUERY_TOO_LONG",
    };
  }

  // Control characters / null bytes
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(query)) {
    return {
      ok: false,
      status: 400,
      error: "query contains invalid characters",
      code: "QUERY_INVALID_CHARS",
    };
  }

  if (HOSTILE_MARKUP.test(query)) {
    return {
      ok: false,
      status: 400,
      error: "query rejected: hostile markup",
      code: "QUERY_HOSTILE",
    };
  }

  if (HOSTILE_PROMPT.test(query)) {
    return {
      ok: false,
      status: 400,
      error: "query rejected: hostile instructions",
      code: "QUERY_HOSTILE",
    };
  }

  // Must contain at least one letter or number (reject punctuation-only)
  if (!/[A-Za-z0-9\u00C0-\u024F]/.test(query)) {
    return {
      ok: false,
      status: 400,
      error: "query rejected: not actionable",
      code: "QUERY_NOT_ACTIONABLE",
    };
  }

  let forcedDomain: DecisionRunDomain | null = null;
  if (raw.forcedDomain != null && raw.forcedDomain !== "") {
    if (typeof raw.forcedDomain !== "string") {
      return {
        ok: false,
        status: 400,
        error: "forcedDomain must be a string",
        code: "INVALID_FORCED_DOMAIN",
      };
    }
    const fd = raw.forcedDomain.trim().toLowerCase();
    if (!isDecisionRunDomain(fd)) {
      return {
        ok: false,
        status: 400,
        error: "unsupported forcedDomain",
        code: "UNSUPPORTED_DOMAIN",
      };
    }
    forcedDomain = fd;
  }

  const market = optionalString(raw.marketCountry, "marketCountry", 8);
  if (!market.ok) return market;
  const currency = optionalString(raw.currency, "currency", 8);
  if (!currency.ok) return currency;

  return {
    ok: true,
    value: {
      query,
      forcedDomain,
      marketCountry: market.value,
      currency: currency.value,
    },
  };
}
