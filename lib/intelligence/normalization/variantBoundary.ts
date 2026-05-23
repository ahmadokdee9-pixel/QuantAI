/**
 * Variant boundary intelligence — storage / color / size / model-tier differentiation.
 * Used to block unsafe equivalence clustering and refine false-collapse shadow metrics.
 */

import type { QuantProduct } from "@/lib/shoppingScore";
import { extractProductIdentity } from "@/lib/deals/productIdentity";
import { createCanonicalProductIdentity } from "@/lib/intelligence/productIdentity";
import {
  normalizeColorKey,
  normalizeConditionLabel,
  normalizeSizeKey,
  normalizeStorageGb,
  type NormalizedCondition,
} from "@/lib/intelligence/variantNormalization";

export type VariantAxes = {
  storageGb: number | null;
  colorKey: string | null;
  sizeKey: string | null;
  modelTierKey: string | null;
  condition: NormalizedCondition;
};

export type VariantBoundaryVerdict = {
  conflict: boolean;
  reasons: string[];
};

function listingBlob(p: QuantProduct): string {
  return `${p.title} ${Array.isArray(p.extensions) ? p.extensions.join(" ") : ""}`;
}

/** Phone / audio model tier — pro, max, plus, mini, generation. */
export function extractModelTierKey(blob: string): string | null {
  const t = blob.toLowerCase();

  if (/\biphone\b/.test(t)) {
    const gen = t.match(/\biphone\s*(\d{1,2})\b/)?.[1] ?? "";
    const tiers: string[] = [];
    if (/\bpro\s*max\b|\bpro-max\b/.test(t)) tiers.push("pro_max");
    else if (/\bpro\b/.test(t)) tiers.push("pro");
    if (/\bmax\b/.test(t) && !tiers.includes("pro_max")) tiers.push("max");
    if (/\bplus\b/.test(t)) tiers.push("plus");
    if (/\bmini\b/.test(t)) tiers.push("mini");
    if (/\b(?:se|e)\b/.test(t) && gen) tiers.push("e");
    if (!gen && !tiers.length) return null;
    return tiers.length ? `iphone${gen}_${tiers.sort().join("_")}` : gen ? `iphone${gen}` : null;
  }

  if (/\b(galaxy|samsung)\b/.test(t) && /\bs\d{1,2}\b/.test(t)) {
    const model = t.match(/\b(s\d{1,2}(?:\s*ultra|\s*plus|\s*fe)?)\b/)?.[1]?.replace(/\s+/g, "_") ?? "galaxy";
    const storage = normalizeStorageGb(t);
    return storage != null ? `${model}_s${storage}` : model;
  }

  if (/\bairpods?\b/.test(t)) {
    if (/\bmax\b/.test(t)) return "airpods_max";
    if (
      /\bpro\s*(?:2|ii|2nd|second)\b|\bpro\s*2\b|\b2nd\s*gen\b|\bpro\s*2s\b|\bairpods?\s*pro\s*2\b/i.test(
        t
      )
    ) {
      return "airpods_pro_2";
    }
    if (/\bpro\b/.test(t)) return "airpods_pro";
    if (/\b(?:3rd|third)\s*gen\b|\bairpods\s*3\b/.test(t)) return "airpods_3";
    if (/\b(?:2nd|second)\s*gen\b|\bairpods\s*2\b/.test(t)) return "airpods_2";
    return "airpods";
  }

  if (/\bnike\b/.test(t) && /\bair\s*force\b/.test(t)) {
    const color = normalizeColorKey(t);
    const size = normalizeSizeKey(t);
    const parts = ["af1"];
    if (color) parts.push(color);
    if (size) parts.push(size);
    return parts.join("_");
  }

  return null;
}

/** Parse axes from canonical variant fingerprint segments (s128|cblack|z10|cond:new). */
export function parseVariantFingerprintSegments(fingerprint: string): Partial<VariantAxes> {
  const parts = fingerprint.split("|").filter(Boolean);
  const out: Partial<VariantAxes> = {};
  for (const part of parts) {
    if (part.startsWith("s") && part.length > 1) {
      const n = parseInt(part.slice(1), 10);
      if (Number.isFinite(n)) out.storageGb = n;
    } else if (part.startsWith("c") && part.length > 1) {
      out.colorKey = part.slice(1);
    } else if (part.startsWith("z") && part.length > 1) {
      out.sizeKey = part.slice(1);
    } else if (part.startsWith("cond:")) {
      out.condition = part.slice(5) as NormalizedCondition;
    }
  }
  return out;
}

/** Extract comparable variant axes from a listing (title + extensions). */
export function extractVariantAxes(product: QuantProduct): VariantAxes {
  const blob = listingBlob(product);
  const spine = createCanonicalProductIdentity(product);
  const parsed = parseVariantFingerprintSegments(spine.variantFingerprint);

  const storageGb = parsed.storageGb ?? normalizeStorageGb(blob);
  const colorKey = parsed.colorKey ?? normalizeColorKey(blob);
  const sizeKey = parsed.sizeKey ?? normalizeSizeKey(blob);
  const modelTierKey = extractModelTierKey(blob);
  const condition = parsed.condition ?? normalizeConditionLabel(blob);

  return { storageGb, colorKey, sizeKey, modelTierKey, condition };
}

function axisConflict(
  label: string,
  a: string | number | null,
  b: string | number | null
): string | null {
  if (a == null || b == null) return null;
  if (a !== b) return label;
  return null;
}

/**
 * True when two listings must NOT share an equivalence class (different purchasable variants).
 * Missing axis on one side does not block (retailer omitted color/size); both sides required to conflict.
 */
export function variantBoundaryConflict(a: VariantAxes, b: VariantAxes): VariantBoundaryVerdict {
  const reasons: string[] = [];

  const storage = axisConflict("storage_gb", a.storageGb, b.storageGb);
  if (storage) reasons.push(storage);

  const color = axisConflict("color", a.colorKey, b.colorKey);
  if (color) reasons.push(color);

  const size = axisConflict("size", a.sizeKey, b.sizeKey);
  if (size) reasons.push(size);

  const tier = axisConflict("model_tier", a.modelTierKey, b.modelTierKey);
  if (tier) reasons.push(tier);

  const condA = a.condition;
  const condB = b.condition;
  if (
    condA !== "unknown" &&
    condB !== "unknown" &&
    condA !== condB &&
    (condA === "new" || condB === "new") &&
    (condA === "refurbished" || condA === "used" || condB === "refurbished" || condB === "used")
  ) {
    reasons.push("condition");
  }

  return { conflict: reasons.length > 0, reasons };
}

/** Whether an equivalence group contains a hard variant boundary violation. */
export function equivalenceGroupHasVariantBoundaryViolation(
  products: QuantProduct[],
  memberLinks: string[]
): { violation: boolean; reasons: string[]; pairs: number } {
  const byLink = new Map(products.map((p) => [p.link, p]));
  const members = memberLinks.map((l) => byLink.get(l)).filter((p): p is QuantProduct => Boolean(p));
  if (members.length < 2) return { violation: false, reasons: [], pairs: 0 };

  const allReasons = new Set<string>();
  let pairs = 0;

  for (let i = 0; i < members.length; i++) {
    for (let j = i + 1; j < members.length; j++) {
      const axesA = extractVariantAxes(members[i]!);
      const axesB = extractVariantAxes(members[j]!);
      const verdict = variantBoundaryConflict(axesA, axesB);
      if (verdict.conflict) {
        pairs++;
        for (const r of verdict.reasons) allReasons.add(r);
      }
    }
  }

  return {
    violation: pairs > 0,
    reasons: [...allReasons],
    pairs,
  };
}
