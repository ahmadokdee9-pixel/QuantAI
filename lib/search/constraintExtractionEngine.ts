/**
 * Phase 3 — Constraint extraction engine for search ranking and filtering.
 */

import type { ExtractedSearchIntent } from "@/lib/search/intentExtractionEngine";
import { extractSearchIntent } from "@/lib/search/intentExtractionEngine";
import type { CanonicalQueryContract } from "@/lib/search/canonicalQuery";
import { buildSearchQueryUnderstanding } from "@/lib/search/queryUnderstanding";

export type ParsedSearchConstraints = {
  maxPrice: number | null;
  minPrice: number | null;
  sizeInches: number | null;
  refreshRateHz: number | null;
  requiresUsbC: boolean;
  gpuModel: string | null;
  sizeDimensions: string | null;
  materialTags: string[];
  firmnessTags: string[];
  platform: string | null;
  rawTokens: string[];
};

function parseMaxPrice(envelope: string): number | null {
  const m =
    envelope.match(/(?:under|below|less than|max|up to|onder|tot)\s*(?:€|eur|usd|\$|£|gbp)?\s*(\d{2,5})/i) ??
    envelope.match(/(?:تحت|أقل\s*من|اقل\s*من|حتى)\s*(\d{2,5})/i);
  return m ? Number.parseInt(m[1]!, 10) : null;
}

function parseSizeInches(envelope: string): number | null {
  const m = envelope.match(/\b(\d{2,3})\s*(?:inch|inches|"|''|cm\s+tv)\b/i);
  if (!m) return null;
  const n = Number.parseInt(m[1]!, 10);
  return n >= 10 && n <= 120 ? n : null;
}

function parseRefreshRate(envelope: string): number | null {
  const m = envelope.match(/\b(\d{2,3})\s*hz\b/i);
  return m ? Number.parseInt(m[1]!, 10) : null;
}

function parseGpuModel(envelope: string): string | null {
  const m = envelope.match(/\b(rtx\s*\d{3,4}|gtx\s*\d{3,4})\b/i);
  return m ? m[0].replace(/\s+/g, " ").trim().toLowerCase() : null;
}

function parseDimensions(envelope: string): string | null {
  const m = envelope.match(/\b(\d{2})\s*x\s*(\d{2})\b/i);
  return m ? `${m[1]}x${m[2]}`.toLowerCase() : null;
}

/** Parse all structured constraints from a query. */
export function extractSearchConstraints(query: string, canonical?: CanonicalQueryContract): ParsedSearchConstraints {
  const semantic = canonical?.semantic ?? buildSearchQueryUnderstanding(query);
  const envelope = semantic.envelope;
  const materialTags: string[] = [];
  const firmnessTags: string[] = [];

  if (/\bmemory\s+foam\b/i.test(envelope)) materialTags.push("memory_foam");
  if (/\bnonstick\b/i.test(envelope)) materialTags.push("nonstick");
  if (/\bleather\b/i.test(envelope)) materialTags.push("leather");
  if (/\bmedium\s+firm\b/i.test(envelope)) firmnessTags.push("medium_firm");
  if (/\bthick\b/i.test(envelope) && /\byoga\s+mat\b/i.test(envelope)) materialTags.push("thick");

  const rawTokens = envelope
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length >= 2)
    .slice(0, 24);

  return {
    maxPrice: parseMaxPrice(envelope) ?? semantic.constraints.maxPrice ?? canonical?.budget.maxPrice ?? null,
    minPrice: null,
    sizeInches: parseSizeInches(envelope),
    refreshRateHz: parseRefreshRate(envelope),
    requiresUsbC: /\busb[-\s]?c\b/i.test(envelope),
    gpuModel: parseGpuModel(envelope),
    sizeDimensions: parseDimensions(envelope),
    materialTags,
    firmnessTags,
    platform: semantic.constraints.platform,
    rawTokens,
  };
}

export type ConstraintViolation = {
  code: string;
  severity: "hard" | "soft";
  penalty: number;
};

/** Score constraint violations for a listing (higher penalty = worse). */
export function assessConstraintViolations(
  title: string,
  price: number,
  constraints: ParsedSearchConstraints,
  intent: ExtractedSearchIntent
): ConstraintViolation[] {
  const text = title.toLowerCase();
  const violations: ConstraintViolation[] = [];

  if (constraints.maxPrice != null && price > 0) {
    const max = constraints.maxPrice;
    if (price > max * 1.15) {
      violations.push({
        code: "budget_exceeded",
        severity: price > max * 1.5 ? "hard" : "soft",
        penalty: Math.min(40, 12 + ((price - max) / max) * 20),
      });
    }
  }

  if (constraints.sizeInches != null) {
    const listingSize = text.match(/\b(\d{2,3})\s*(?:inch|"|in\b)/i)?.[1];
    if (listingSize && Math.abs(Number(listingSize) - constraints.sizeInches) > 8) {
      violations.push({ code: "size_mismatch", severity: "soft", penalty: 18 });
    }
  }

  if (constraints.refreshRateHz != null) {
    const hz = text.match(/\b(\d{2,3})\s*hz\b/i)?.[1];
    if (hz && Number(hz) < constraints.refreshRateHz - 10) {
      violations.push({ code: "refresh_rate_low", severity: "soft", penalty: 16 });
    }
  }

  if (constraints.requiresUsbC && !/\busb[-\s]?c\b/i.test(text)) {
    violations.push({ code: "missing_usb_c", severity: "soft", penalty: 10 });
  }

  if (constraints.gpuModel) {
    const norm = constraints.gpuModel.replace(/\s+/g, "").toLowerCase();
    const textNorm = text.replace(/\s+/g, "").toLowerCase();
    const hasGpuModel = textNorm.includes(norm) || text.includes(constraints.gpuModel);
    const hasGpuClass = /\b(rtx|gtx|geforce|graphics|gpu)\b/i.test(text);
    if (!hasGpuModel && !hasGpuClass) {
      if (/\b(instax|camera|fujifilm)\b/i.test(text) && intent.productType === "graphics_card") {
        violations.push({ code: "wrong_product_gpu", severity: "hard", penalty: 50 });
      } else {
        violations.push({ code: "gpu_model_missing", severity: "hard", penalty: 35 });
      }
    }
  }

  if (intent.performanceIntent === "stability_running" || intent.productType === "running_shoes") {
    if (
      /\b(air\s+force|handball|spezial|3mc|lifestyle|dunk|samba|walking\s+shoe|walkers?)\b/i.test(text) &&
      !/\b(running|support|stability|gel|kayano|guide|motion|overpronation|flat\s+feet)\b/i.test(text)
    ) {
      violations.push({ code: "lifestyle_not_running", severity: "hard", penalty: 45 });
    }
    if (
      (intent.performanceIntent === "stability_running" || intent.technicalRequirements.includes("flat_feet_support")) &&
      /\b(stability|support|overpronation|motion\s+control|structured|guide|kayano|beast|adrenaline)\b/i.test(text)
    ) {
      violations.push({ code: "flat_feet_support_match", severity: "soft", penalty: -8 });
    }
    if (intent.gender === "men" && /\b(dames|women'?s?|womens|female|maat:\s*3[0-9])\b/i.test(text)) {
      violations.push({ code: "gender_mismatch", severity: "hard", penalty: 40 });
    }
  }

  if (intent.productType === "lipstick" && /\b(sticker|decal|pin|badge|poster)\b/i.test(text)) {
    violations.push({ code: "beauty_sticker_pollution", severity: "hard", penalty: 48 });
  }

  if (constraints.materialTags.includes("memory_foam") && !/\b(memory\s+foam|matras|mattress|foam)\b/i.test(text)) {
    violations.push({ code: "material_mismatch", severity: "soft", penalty: 12 });
  }

  return violations;
}

export function totalConstraintPenalty(violations: ConstraintViolation[]): number {
  return violations.reduce((sum, v) => sum + v.penalty, 0);
}
