/**
 * Detect query vs listing generation / variant conflicts (e.g. iPhone 16 query, iPhone 15 listing).
 */

import type { CanonicalQueryContract } from "@/lib/search/canonicalQuery";
import type { QuantProduct } from "@/lib/shoppingScore";

function extractIphoneGen(text: string): number | null {
  const m = text.match(/\biphone\s*(\d{1,2})\b/i) ?? text.match(/(?:ايفون|آيفون)\s*(\d{1,2})/i);
  return m ? Number.parseInt(m[1]!, 10) : null;
}

function extractAirPodsGen(text: string): "pro" | "max" | "2" | "3" | "4" | null {
  if (/\bairpods?\s*max\b/i.test(text)) return "max";
  if (/\bairpods?\s*pro\b/i.test(text)) return "pro";
  const g = text.match(/\bairpods?\s*(\d)\b/i)?.[1];
  if (g === "2" || g === "3" || g === "4") return g;
  return null;
}

function listingBlob(p: QuantProduct): string {
  return `${p.title} ${Array.isArray(p.extensions) ? p.extensions.join(" ") : ""}`.toLowerCase();
}

export type ModelGenerationConflict = {
  conflict: boolean;
  reason: string | null;
  severity01: number;
};

/** True when listing clearly targets a different generation than the query contract. */
export function assessModelGenerationConflict(
  product: QuantProduct,
  canonicalQuery?: CanonicalQueryContract
): ModelGenerationConflict {
  if (!canonicalQuery) return { conflict: false, reason: null, severity01: 0 };

  const qText = `${canonicalQuery.originalQuery} ${canonicalQuery.model ?? ""} ${canonicalQuery.variant ?? ""}`;
  const blob = listingBlob(product);

  const qIphone = extractIphoneGen(qText);
  if (qIphone != null) {
    const lIphone = extractIphoneGen(blob);
    if (lIphone != null && lIphone !== qIphone) {
      const gap = Math.abs(lIphone - qIphone);
      return {
        conflict: true,
        reason: `generation_mismatch_iphone_${qIphone}_vs_${lIphone}`,
        severity01: gap >= 2 ? 0.95 : 0.72,
      };
    }
  }

  const qPods = extractAirPodsGen(qText);
  if (qPods != null) {
    const lPods = extractAirPodsGen(blob);
    if (lPods != null && lPods !== qPods) {
      return {
        conflict: true,
        reason: `generation_mismatch_airpods_${qPods}_vs_${lPods}`,
        severity01: 0.68,
      };
    }
  }

  if (canonicalQuery.model && /samba/i.test(canonicalQuery.model)) {
    if (/\b(gazelle|campus|superstar)\b/i.test(blob) && !/\bsamba\b/i.test(blob)) {
      return { conflict: true, reason: "sibling_model_not_samba", severity01: 0.55 };
    }
  }

  return { conflict: false, reason: null, severity01: 0 };
}
