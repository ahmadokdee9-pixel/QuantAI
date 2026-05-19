import { NextResponse } from "next/server";
import { supabaseAdminConfigured } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET() {
  const redisConfigured = Boolean(
    process.env.UPSTASH_REDIS_REST_URL?.trim() && process.env.UPSTASH_REDIS_REST_TOKEN?.trim()
  );

  return NextResponse.json({
    ok: true,
    ts: new Date().toISOString(),
    services: {
      clerk: Boolean(process.env.CLERK_SECRET_KEY?.trim() && process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim()),
      supabase: supabaseAdminConfigured,
      serpapi: Boolean(process.env.SERPAPI_KEY?.trim()),
      openai: Boolean(process.env.OPENAI_API_KEY?.trim()),
      stripe: Boolean(process.env.STRIPE_SECRET_KEY?.trim()),
      upstash: redisConfigured,
    },
    warnings: [
      !redisConfigured && process.env.VERCEL_ENV === "production"
        ? "UPSTASH_REDIS not configured — rate limits use in-memory fallback only"
        : null,
    ].filter(Boolean),
  });
}
