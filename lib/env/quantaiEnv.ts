/**
 * QuantAI environment contract — single source of truth for required keys and startup checks.
 * Never log secret values; only report missing key names.
 */

export type EnvVarSpec = {
  key: string;
  /** Human label for developer messages */
  label: string;
  /** Blocks search, auth, persistence, or build-critical paths when missing */
  required: boolean;
  /** Which product surface depends on this key */
  systems: string[];
  /** Safe to expose in the browser (NEXT_PUBLIC_*) */
  public?: boolean;
};

/** Keys pulled from Vercel production for local dev — see docs/ENVIRONMENT.md */
export const QUANTAI_ENV_SPECS: EnvVarSpec[] = [
  {
    key: "NEXT_PUBLIC_APP_URL",
    label: "App URL",
    required: false,
    systems: ["stripe", "metadata"],
  },
  {
    key: "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
    label: "Clerk publishable key",
    required: true,
    systems: ["auth"],
    public: true,
  },
  {
    key: "CLERK_SECRET_KEY",
    label: "Clerk secret key",
    required: true,
    systems: ["auth", "api"],
  },
  {
    key: "NEXT_PUBLIC_SUPABASE_URL",
    label: "Supabase project URL",
    required: true,
    systems: ["supabase", "saved-products", "watchlist", "history"],
    public: true,
  },
  {
    key: "SUPABASE_SERVICE_ROLE_KEY",
    label: "Supabase service role key",
    required: true,
    systems: ["supabase", "saved-products", "watchlist", "history"],
  },
  {
    key: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    label: "Supabase anon key",
    required: false,
    systems: ["supabase-client"],
    public: true,
  },
  {
    key: "SERPAPI_KEY",
    label: "SerpApi key",
    required: true,
    systems: ["search", "live-discovery"],
  },
  {
    key: "OPENAI_API_KEY",
    label: "OpenAI API key",
    required: true,
    systems: ["ai-chat", "compare-verdict", "commerce-ai"],
  },
  {
    key: "STRIPE_SECRET_KEY",
    label: "Stripe secret key",
    required: false,
    systems: ["billing"],
  },
  {
    key: "STRIPE_WEBHOOK_SECRET",
    label: "Stripe webhook secret",
    required: false,
    systems: ["billing"],
  },
  {
    key: "STRIPE_PRICE_ID_PRO",
    label: "Stripe Pro price id",
    required: false,
    systems: ["billing"],
  },
  {
    key: "STRIPE_PRICE_ID_PREMIUM",
    label: "Stripe Premium price id",
    required: false,
    systems: ["billing"],
  },
  {
    key: "UPSTASH_REDIS_REST_URL",
    label: "Upstash Redis URL",
    required: false,
    systems: ["rate-limit"],
  },
  {
    key: "UPSTASH_REDIS_REST_TOKEN",
    label: "Upstash Redis token",
    required: false,
    systems: ["rate-limit"],
  },
  {
    key: "QUANTAI_ANALYTICS_SINK_URL",
    label: "Analytics sink URL",
    required: false,
    systems: ["analytics"],
  },
];

export type EnvValidationResult = {
  ok: boolean;
  missingRequired: EnvVarSpec[];
  missingOptional: EnvVarSpec[];
  present: string[];
};

function envValue(key: string): string | undefined {
  const v = process.env[key];
  if (v == null) return undefined;
  const t = v.trim();
  return t.length ? t : undefined;
}

/** Validate QuantAI env without printing secrets. */
export function validateQuantaiEnv(opts?: {
  /** When true, missing optional keys are listed (dev/build scripts). */
  reportOptional?: boolean;
}): EnvValidationResult {
  const missingRequired: EnvVarSpec[] = [];
  const missingOptional: EnvVarSpec[] = [];
  const present: string[] = [];

  for (const spec of QUANTAI_ENV_SPECS) {
    if (envValue(spec.key)) {
      present.push(spec.key);
    } else if (spec.required) {
      missingRequired.push(spec);
    } else if (opts?.reportOptional) {
      missingOptional.push(spec);
    }
  }

  return {
    ok: missingRequired.length === 0,
    missingRequired,
    missingOptional,
    present,
  };
}

/** Format developer-facing startup message (no secret values). */
export function formatEnvValidationMessage(result: EnvValidationResult): string {
  const lines: string[] = [];
  if (result.ok) {
    lines.push("[QuantAI env] Core variables present.");
  } else {
    lines.push("[QuantAI env] Missing required environment variables:");
    for (const spec of result.missingRequired) {
      lines.push(`  - ${spec.key} (${spec.label}) → ${spec.systems.join(", ")}`);
    }
    lines.push("");
    lines.push("Restore locally: npm run env:sync");
    lines.push("Template: copy .env.example → .env.local");
    lines.push("Docs: docs/ENVIRONMENT.md");
  }
  if (result.missingOptional.length > 0) {
    lines.push("");
    lines.push("[QuantAI env] Optional keys not set:");
    for (const spec of result.missingOptional) {
      lines.push(`  - ${spec.key} (${spec.systems.join(", ")})`);
    }
  }
  return lines.join("\n");
}

/** Server startup hook — logs clearly in development; never throws in production. */
export function assertQuantaiEnvOnBoot(): void {
  const result = validateQuantaiEnv({ reportOptional: process.env.NODE_ENV === "development" });
  const message = formatEnvValidationMessage(result);
  if (!result.ok) {
    if (process.env.NODE_ENV === "production") {
      console.error(message);
    } else {
      console.warn(message);
    }
    return;
  }
  if (process.env.NODE_ENV === "development") {
    console.info(message);
  }

  if (process.env.NODE_ENV === "production") {
    const hasUpstash =
      Boolean(envValue("UPSTASH_REDIS_REST_URL")) && Boolean(envValue("UPSTASH_REDIS_REST_TOKEN"));
    if (!hasUpstash) {
      console.warn(
        "[QuantAI env] UPSTASH_REDIS_REST_URL/TOKEN not set — guest search rate limits use in-memory fallback (not shared across instances)."
      );
    }
  }
}
