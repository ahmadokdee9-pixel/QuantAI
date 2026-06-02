/**
 * Phase 3 — Intent extraction engine for search intelligence upgrade.
 * Deterministic query understanding; influences ranking via searchIntelligenceUpgrade.
 */

import type { CanonicalQueryContract } from "@/lib/search/canonicalQuery";
import { buildSearchQueryUnderstanding, type SemanticProductCategory } from "@/lib/search/queryUnderstanding";

export type ExtractedUserGoal =
  | "exact_purchase"
  | "best_value"
  | "budget_hunt"
  | "premium_purchase"
  | "comparison"
  | "alternative"
  | "general_discovery";

export type ExtractedSearchIntent = {
  category: SemanticProductCategory;
  productType: string;
  subtype: string | null;
  brand: string | null;
  useCase: string | null;
  userGoal: ExtractedUserGoal;
  gender: "men" | "women" | "unisex" | null;
  style: string[];
  technicalRequirements: string[];
  budgetConstraints: {
    maxPrice: number | null;
    minPrice: number | null;
    currency: "EUR" | "USD" | "GBP" | "unknown";
    bestValue: boolean;
  };
  platform: string | null;
  performanceIntent: string | null;
};

const BRAND_PATTERNS: { brand: string; rx: RegExp }[] = [
  { brand: "apple", rx: /\b(apple|iphone|macbook|airpods?)\b/i },
  { brand: "samsung", rx: /\b(samsung|galaxy)\b/i },
  { brand: "sony", rx: /\bsony\b/i },
  { brand: "nike", rx: /\bnike\b/i },
  { brand: "adidas", rx: /\badidas\b/i },
  { brand: "cerave", rx: /\bcerave\b/i },
  { brand: "mac", rx: /\bmac\b|\bruby\s+woo\b/i },
  { brand: "nvidia", rx: /\b(nvidia|geforce|rtx|gtx)\b/i },
  { brand: "zotac", rx: /\bzotac\b/i },
  { brand: "playstation", rx: /\b(ps5|playstation)\b/i },
  { brand: "ikea", rx: /\bikea\b/i },
];

function detectGender(envelope: string): ExtractedSearchIntent["gender"] {
  if (/\b(men'?s?|mens|male|heren|for men|رجال|رجالي)\b/i.test(envelope)) return "men";
  if (/\b(women'?s?|womens|female|dames|for women|نساء|نسائي)\b/i.test(envelope)) return "women";
  if (/\b(unisex)\b/i.test(envelope)) return "unisex";
  return null;
}

function detectProductType(category: SemanticProductCategory, envelope: string): { type: string; subtype: string | null } {
  const e = envelope.toLowerCase();
  if (/\b(running\s+shoe|flat\s+feet|overpronation|stability\s+shoe)\b/i.test(e)) {
    return { type: "running_shoes", subtype: "stability_running" };
  }
  if (/\b(kayano|gel[-\s]?nimbus|wave\s+inspire|ghost\s+\d|pegasus|adrenaline\s+gts|bondi|clifton)\b/i.test(e)) {
    return { type: "running_shoes", subtype: "performance_running" };
  }
  if (/\b(gaming\s+headset|wireless\s+gaming\s+headset)\b/i.test(e)) {
    return { type: "gaming_headset", subtype: "wireless" };
  }
  if (/\b(graphics\s+card|gpu|rtx\s*\d+|gtx\s*\d+)\b/i.test(e)) {
    const gpuSubtype = e.match(/\b(rtx\s*\d{3,4}|gtx\s*\d{3,4})\b/i)?.[0]?.replace(/\s+/g, " ") ?? null;
    // Detect AI / ML training intent on GPU queries
    if (/\b(ai|machine\s+learning|ml|deep\s+learning|llm|training|cuda|vram|tensor)\b/i.test(e)) {
      return { type: "graphics_card", subtype: "ai_training" };
    }
    return { type: "graphics_card", subtype: gpuSubtype };
  }
  // GPU query without explicit model token but with ai/training intent
  if (/\b(ai|machine\s+learning|ml|deep\s+learning|llm|tensor)\b/i.test(e) && /\b(gpu|graphics\s+card|video\s+card)\b/i.test(e)) {
    return { type: "graphics_card", subtype: "ai_training" };
  }
  if (/\b(mechanical\s+keyboard|mx\s+keys|keychron|quiet\s+tactile)\b/i.test(e)) return { type: "mechanical_keyboard", subtype: null };
  if (/\b(coffee\s+maker|espresso\s+machine|drip\s+coffee)\b/i.test(e)) return { type: "coffee_maker", subtype: null };
  if (/\b(cookware|nonstick|induction\s+pan)\b/i.test(e)) return { type: "cookware", subtype: null };
  if (/\b(crossbody\s+bag|handbag|chinos|slim\s+fit\s+pants)\b/i.test(e)) return { type: "fashion", subtype: null };
  if (/\b(webcam|gopro|hero\s+\d+)\b/i.test(e)) return { type: "webcam", subtype: null };
  if (/\b(stand\s+mixer|kitchenaid)\b/i.test(e)) return { type: "stand_mixer", subtype: null };
  if (/\b(monitor\s+arm|dual\s+monitor)\b/i.test(e)) return { type: "monitor_mount", subtype: "dual" };
  if (/\b(desk\s+organizer|cable\s+management)\b/i.test(e)) return { type: "desk_accessory", subtype: "cable_management" };
  if (/\b(standing\s+desk|sit[-\s]?stand)\b/i.test(e)) return { type: "standing_desk", subtype: "electric" };
  if (/\b(smart\s+tv|4k\s+tv|oled|qled|\d+\s*inch\s+tv)\b/i.test(e)) return { type: "television", subtype: null };
  if (/\b(programming|coder|developer|software\s+engineer)\b/i.test(e) && /\bmonitor\b/i.test(e)) {
    return { type: "programming_monitor", subtype: "productivity" };
  }
  if (/\b(gaming\s+monitor|\d+\s*hz)\b/i.test(e)) return { type: "gaming_monitor", subtype: null };
  if (/\b(charging\s+dock|controller\s+dock)\b/i.test(e)) return { type: "controller_accessory", subtype: "charging_dock" };
  if (/\b(robot\s+vacuum)\b/i.test(e)) return { type: "robot_vacuum", subtype: null };
  if (/\b(air\s+fryer)\b/i.test(e)) return { type: "air_fryer", subtype: null };
  if (/\b(lipstick|ruby\s+woo)\b/i.test(e)) return { type: "lipstick", subtype: null };
  if (/\b(retinol\s+serum)\b/i.test(e)) return { type: "retinol_serum", subtype: null };
  if (/\b(moisturiz(?:ing|er|e))\b/i.test(e)) return { type: "moisturizer", subtype: null };
  if (/\b(sectional\s+sofa|sofa)\b/i.test(e)) return { type: "sofa", subtype: /\bsectional\b/i.test(e) ? "sectional" : null };
  if (/\b(office\s+chair|ergonomic\s+chair)\b/i.test(e)) return { type: "office_chair", subtype: "ergonomic" };
  if (/\b(mattress|memory\s+foam)\b/i.test(e)) return { type: "mattress", subtype: "memory_foam" };
  if (/\b(yoga\s+mat)\b/i.test(e)) return { type: "yoga_mat", subtype: null };
  if (/\b(dumbbell|adjustable\s+dumbbell)\b/i.test(e)) return { type: "dumbbells", subtype: "adjustable" };
  if (/\b(headphones?|earbuds?)\b/i.test(e)) return { type: "headphones", subtype: /\bnoise\s+cancell/i.test(e) ? "anc" : null };
  if (category !== "unknown") return { type: category, subtype: null };
  return { type: "unknown", subtype: null };
}

function detectTechnicalRequirements(envelope: string): string[] {
  const reqs: string[] = [];
  const patterns: [RegExp, string][] = [
    [/\b\d+\s*inch\b/i, "size_inch"],
    [/\b4k\b|\buhd\b/i, "4k"],
    [/\b144hz\b|\b165hz\b|\b240hz\b/i, "high_refresh"],
    [/\busb[-\s]?c\b/i, "usb_c"],
    [/\bwireless\b/i, "wireless"],
    [/\bnoise\s+cancell/i, "anc"],
    [/\b(rtx\s*\d{3,4}|gtx\s*\d{3,4})\b/i, "gpu_model"],
    [/\b\d{2}x\d{2}\b/i, "size_dimensions"],
    [/\bmemory\s+foam\b/i, "memory_foam"],
    [/\bmedium\s+firm\b/i, "medium_firm"],
    [/\binduction\b/i, "induction_compatible"],
    [/\bflat\s+feet\b|\boverpronation\b/i, "flat_feet_support"],
    [/\bquiet\s+tactile\b|\bmechanical\b/i, "mechanical_switch"],
    [/\btactile\b/i, "tactile_switch"],
    [/\blinear\b/i, "linear_switch"],
    [/\b(ai\s+training|cuda|vram|deep\s+learning|machine\s+learning|tensor)\b/i, "ai_training"],
    [/\blumbar\s+support\b/i, "lumbar_support"],
    [/\b6\s*quart\b|\b6l\b|\b6\s*l\b/i, "capacity_6qt"],
  ];
  for (const [rx, tag] of patterns) {
    const m = envelope.match(rx);
    if (m) {
      if (tag === "size_inch" || tag === "gpu_model" || tag === "size_dimensions") reqs.push(m[0].toLowerCase().trim());
      else reqs.push(tag);
    }
  }
  return [...new Set(reqs)];
}

function detectUserGoal(
  semantic: ReturnType<typeof buildSearchQueryUnderstanding>,
  canonical?: CanonicalQueryContract
): ExtractedUserGoal {
  if (semantic.comparisonIntent) return "comparison";
  if (semantic.alternativeIntent.active) return "alternative";
  if (canonical?.intent.primary === "best_value" || /\bbest\s+value\b/i.test(semantic.raw)) return "best_value";
  if (semantic.budgetIntent01 >= 0.55 || semantic.constraints.maxPrice != null) return "budget_hunt";
  if (semantic.premiumIntent01 >= 0.58 || canonical?.intent.primary === "premium") return "premium_purchase";
  if (canonical?.intent.primary === "exact_product" || canonical?.marketMode === "exact_sku") return "exact_purchase";
  return "general_discovery";
}

function detectBrand(envelope: string, canonical?: CanonicalQueryContract): string | null {
  if (canonical?.brand) return canonical.brand.toLowerCase();
  for (const { brand, rx } of BRAND_PATTERNS) {
    if (rx.test(envelope)) return brand;
  }
  return null;
}

function detectPerformanceIntent(envelope: string, productType: string): string | null {
  if (/\bflat\s+feet\b/i.test(envelope)) return "stability_running";
  if (/\brunning\b/i.test(envelope) && productType.includes("shoe")) return "performance_running";
  if (productType === "programming_monitor" || (/\b(programming|coder|developer)\b/i.test(envelope) && /\bmonitor\b/i.test(envelope))) {
    return "programming_work";
  }
  if (productType === "graphics_card" && /\b(ai|machine\s+learning|ml|deep\s+learning|llm|training|cuda|vram|tensor)\b/i.test(envelope)) {
    return "ai_training";
  }
  if (/\b(ergonomic|lumbar)\b/i.test(envelope) && productType === "office_chair") return "ergonomic_support";
  if (/\bgaming\b/i.test(envelope)) return "gaming";
  if (/\bfocus\b|\bnoise\s+cancell/i.test(envelope)) return "focus_work";
  if (/\bbest\s+value\b/i.test(envelope)) return "value_optimization";
  return null;
}

/** Build structured intent used by ranking + decision brief. */
export function extractSearchIntent(query: string, canonical?: CanonicalQueryContract): ExtractedSearchIntent {
  const semantic = canonical?.semantic ?? buildSearchQueryUnderstanding(query);
  const envelope = semantic.envelope;
  const { type, subtype } = detectProductType(semantic.productCategory, envelope);
  const brand = detectBrand(envelope, canonical);
  const technicalRequirements = detectTechnicalRequirements(envelope);
  const maxPrice = semantic.constraints.maxPrice ?? canonical?.budget.maxPrice ?? null;
  const currency = canonical?.budget.currency ?? "unknown";

  return {
    category: semantic.productCategory,
    productType: type,
    subtype,
    brand,
    useCase: semantic.constraints.useCase ?? semantic.usageContext[0] ?? null,
    userGoal: detectUserGoal(semantic, canonical),
    gender: detectGender(envelope),
    style: semantic.styleIntent,
    technicalRequirements,
    budgetConstraints: {
      maxPrice,
      minPrice: null,
      currency,
      bestValue: /\bbest\s+value\b/i.test(envelope) || canonical?.intent.primary === "best_value",
    },
    platform: semantic.constraints.platform,
    performanceIntent: detectPerformanceIntent(envelope, type),
  };
}
