import { NextResponse } from "next/server";
import { getRateLimitStatus } from "@/lib/rate-limit";
import { readOpsHourSnapshot } from "@/lib/ops/productionSignals";
import { supabaseAdminConfigured } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET() {
  const rateLimit = getRateLimitStatus();
  const redisConfigured = rateLimit.shared;
  const ops = await readOpsHourSnapshot();

  const warnings = [
    !redisConfigured && process.env.VERCEL_ENV === "production"
      ? "UPSTASH_REDIS not configured — rate limits fail-closed in Production (no silent in-memory fallback)"
      : null,
    !rateLimit.compliant
      ? "rate_limit_non_compliant — shared Upstash required for this environment"
      : null,
  ].filter(Boolean);

  /** Liveness stays true; readiness reflects shared rate-limit compliance in Production. */
  const ready = rateLimit.compliant;

  return NextResponse.json({
    ok: true,
    ready,
    ts: new Date().toISOString(),
    services: {
      clerk: Boolean(
        process.env.CLERK_SECRET_KEY?.trim() &&
          process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim()
      ),
      supabase: supabaseAdminConfigured,
      serpapi: Boolean(process.env.SERPAPI_KEY?.trim()),
      openai: Boolean(process.env.OPENAI_API_KEY?.trim()),
      stripe: Boolean(process.env.STRIPE_SECRET_KEY?.trim()),
      upstash: redisConfigured,
    },
    rateLimit: {
      backend: rateLimit.backend,
      shared: rateLimit.shared,
      productionStrict: rateLimit.productionStrict,
      compliant: rateLimit.compliant,
    },
    ops: ops
      ? {
          hour: ops.hour,
          search_ok: ops.search_ok,
          search_empty: ops.search_empty,
          api_5xx: ops.api_5xx,
          upstream_cost: ops.upstream_cost,
          rate_limit: ops.rate_limit,
          emptySearchRatePct: ops.emptySearchRatePct,
        }
      : null,
    warnings,
  });
}
