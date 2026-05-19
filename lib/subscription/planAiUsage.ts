/**
 * Daily AI intelligence quota — aligns plan.aiIntelligencePerDay with API enforcement.
 * Uses in-memory buckets when no dedicated usage table exists (fail-open if unknown user).
 */

import { currentUser } from "@clerk/nextjs/server";
import { planDefinition } from "@/lib/subscription/plans";
import { resolveServerSubscriptionTier } from "@/lib/subscription/resolveTier";

const buckets = new Map<string, { count: number; resetAt: number }>();

function utcDayEndMs(): number {
  const d = new Date();
  d.setUTCHours(24, 0, 0, 0);
  return d.getTime();
}

export async function enforcePlanAiDailyLimit(userId: string): Promise<
  | { ok: true }
  | { ok: false; retryAfter: number; limit: number; used: number }
> {
  let user = null;
  try {
    user = await currentUser();
  } catch {
    user = null;
  }
  const tier = await resolveServerSubscriptionTier(userId, user);
  const plan = planDefinition(tier);
  const limit = plan.aiIntelligencePerDay;
  const key = `ai:${userId}`;
  const now = Date.now();
  let bucket = buckets.get(key);
  if (!bucket || now >= bucket.resetAt) {
    bucket = { count: 0, resetAt: utcDayEndMs() };
    buckets.set(key, bucket);
  }
  bucket.count += 1;
  if (bucket.count <= limit) return { ok: true };
  const retryAfter = Math.max(60, Math.ceil((bucket.resetAt - now) / 1000));
  return { ok: false, retryAfter, limit, used: bucket.count };
}
