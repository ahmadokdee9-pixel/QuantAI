/**
 * Production beta stabilization — Next.js cache wrappers.
 */

import { unstable_cache } from "next/cache";
import {
  authCacheRevalidateSeconds,
  guestCacheRevalidateSeconds,
  type SearchPipelineTray,
} from "@/lib/search/productionStabilizationEnv";

export * from "@/lib/search/productionStabilizationEnv";

export function createGuestPipelineCache(
  runPipeline: (q: string) => Promise<SearchPipelineTray>,
  cacheTag: string
) {
  return unstable_cache(
    async (pipelineQuery: string) => runPipeline(pipelineQuery),
    [cacheTag, "guest-pipeline"],
    { revalidate: guestCacheRevalidateSeconds() }
  );
}

export function createAuthPipelineCache(
  runPipeline: (q: string) => Promise<SearchPipelineTray>,
  cacheTag: string
) {
  return unstable_cache(
    async (pipelineQuery: string) => runPipeline(pipelineQuery),
    [cacheTag, "auth-pipeline"],
    { revalidate: authCacheRevalidateSeconds() }
  );
}
