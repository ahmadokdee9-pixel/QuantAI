import type { RefreshJobTarget } from "@/lib/truth/refreshJobTypes";
import type { SkuIdentityMappingRow } from "@/lib/truth/skuIdentityTypes";

/** Attach known canonical SKU ids from persisted mappings. */
export function attachSkuIdsToRefreshTargets(
  targets: RefreshJobTarget[],
  mappings: Map<string, SkuIdentityMappingRow>
): RefreshJobTarget[] {
  return targets.map((target) => {
    const mapping = mappings.get(target.listingUrl);
    if (!mapping) return target;
    return { ...target, skuId: mapping.canonical_sku_id };
  });
}
