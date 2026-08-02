import { auth } from "@clerk/nextjs/server";
import { jsonErr, jsonOk } from "@/lib/api/jsonResponse";
import { buildServerDecisionFeed } from "@/lib/decisionFeed/serverFeed";
import type { FeedDomainFilter } from "@/lib/decisionFeed/types";
import { supabaseAdminConfigured } from "@/lib/supabaseAdmin";

const DOMAINS: FeedDomainFilter[] = [
  "all",
  "product",
  "flight",
  "hotel",
  "subscription",
];

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return jsonErr(401, "Unauthorized");

  const { searchParams } = new URL(req.url);
  const rawDomain = (searchParams.get("domain") || "all").toLowerCase();
  const domain = DOMAINS.includes(rawDomain as FeedDomainFilter)
    ? (rawDomain as FeedDomainFilter)
    : "all";
  const limitRaw = Number(searchParams.get("limit") || "80");
  const limit = Number.isFinite(limitRaw) ? Math.min(120, Math.max(1, Math.round(limitRaw))) : 80;

  const feed = await buildServerDecisionFeed(userId, { domain, limit });

  // Cache-friendly headers for fast repeat visits (private — user-specific)
  return jsonOk(
    {
      ...feed,
      configured: supabaseAdminConfigured,
    },
    {
      headers: {
        "Cache-Control": "private, max-age=15, stale-while-revalidate=30",
      },
    }
  );
}
