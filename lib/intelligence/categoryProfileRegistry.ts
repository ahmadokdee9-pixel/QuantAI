/**
 * Phase 33 — Universal modular category profile registry.
 * Category-native dimensions without hardcoded verdict logic.
 */

import type { ProductIntelligenceSegment } from "@/lib/ui/universalProductIntelligenceEngine";

export type CategoryProfileKey =
  | "phones"
  | "laptops"
  | "sofas"
  | "headphones"
  | "appliances"
  | "fashion"
  | "sports"
  | "home"
  | "beauty"
  | "tools"
  | "dynamic";

export type CategoryProfileSpec = {
  key: CategoryProfileKey;
  label: string;
  dimensionKeys: string[];
  dimensionLabels: string[];
  vocabulary: string[];
  reasoningFocus: string[];
};

const REGISTRY: Record<CategoryProfileKey, CategoryProfileSpec> = {
  phones: {
    key: "phones",
    label: "Phone",
    dimensionKeys: [
      "camera",
      "battery",
      "performance",
      "storage",
      "ecosystem",
      "repairability",
      "resale_value",
      "value",
    ],
    dimensionLabels: [
      "Camera",
      "Battery",
      "Performance",
      "Storage",
      "Ecosystem",
      "Repairability",
      "Resale Value",
      "Value",
    ],
    vocabulary: ["camera", "battery", "performance", "storage", "ecosystem", "repairability", "resale", "iphone", "phone"],
    reasoningFocus: ["camera capability", "battery endurance", "ecosystem fit", "resale path"],
  },
  laptops: {
    key: "laptops",
    label: "Laptop",
    dimensionKeys: ["cpu", "ram", "display", "battery", "portability", "longevity", "repairability", "value"],
    dimensionLabels: ["CPU", "RAM", "Display", "Battery", "Portability", "Longevity", "Repairability", "Value"],
    vocabulary: ["cpu", "ram", "display", "battery", "portability", "longevity", "repairability", "laptop", "macbook"],
    reasoningFocus: ["cpu headroom", "display quality", "portability", "long-term ownership"],
  },
  sofas: {
    key: "sofas",
    label: "Sofa",
    dimensionKeys: [
      "comfort",
      "material_quality",
      "build_quality",
      "durability",
      "maintenance",
      "space_efficiency",
      "design_quality",
      "value",
    ],
    dimensionLabels: [
      "Comfort",
      "Material Quality",
      "Build Quality",
      "Durability",
      "Maintenance",
      "Space Efficiency",
      "Design Quality",
      "Value",
    ],
    vocabulary: ["comfort", "material", "build quality", "durability", "maintenance", "sofa", "seating"],
    reasoningFocus: ["comfort", "material quality", "durability", "daily-use fit"],
  },
  headphones: {
    key: "headphones",
    label: "Headphones",
    dimensionKeys: ["sound", "anc", "comfort", "battery", "codec", "durability", "value"],
    dimensionLabels: ["Sound", "ANC", "Comfort", "Battery", "Codec", "Durability", "Value"],
    vocabulary: ["sound", "anc", "comfort", "battery", "codec", "headphones"],
    reasoningFocus: ["sound quality", "noise cancellation", "comfort", "battery life"],
  },
  appliances: {
    key: "appliances",
    label: "Appliance",
    dimensionKeys: ["efficiency", "capacity", "reliability", "noise", "warranty", "energy", "value"],
    dimensionLabels: ["Efficiency", "Capacity", "Reliability", "Noise", "Warranty", "Energy", "Value"],
    vocabulary: ["efficiency", "capacity", "reliability", "warranty", "appliance"],
    reasoningFocus: ["reliability", "capacity fit", "energy efficiency", "warranty coverage"],
  },
  fashion: {
    key: "fashion",
    label: "Fashion",
    dimensionKeys: ["material", "fit", "durability", "style", "brand", "care", "value"],
    dimensionLabels: ["Material", "Fit", "Durability", "Style", "Brand", "Care", "Value"],
    vocabulary: ["material", "fit", "durability", "style", "fashion"],
    reasoningFocus: ["material quality", "fit", "durability", "style alignment"],
  },
  sports: {
    key: "sports",
    label: "Sports",
    dimensionKeys: ["performance", "durability", "comfort", "weight", "support", "weather", "value"],
    dimensionLabels: ["Performance", "Durability", "Comfort", "Weight", "Support", "Weather", "Value"],
    vocabulary: ["performance", "durability", "comfort", "support", "sports"],
    reasoningFocus: ["performance", "durability", "comfort under use", "support quality"],
  },
  home: {
    key: "home",
    label: "Home",
    dimensionKeys: ["quality", "durability", "design", "maintenance", "space", "material", "value"],
    dimensionLabels: ["Quality", "Durability", "Design", "Maintenance", "Space", "Material", "Value"],
    vocabulary: ["quality", "durability", "design", "maintenance", "home"],
    reasoningFocus: ["build quality", "durability", "design fit", "maintenance burden"],
  },
  beauty: {
    key: "beauty",
    label: "Beauty",
    dimensionKeys: ["ingredients", "skin_fit", "brand_trust", "results", "safety", "value"],
    dimensionLabels: ["Ingredients", "Skin Fit", "Brand Trust", "Results", "Safety", "Value"],
    vocabulary: ["ingredients", "skin", "brand", "results", "beauty"],
    reasoningFocus: ["ingredient quality", "skin compatibility", "brand trust", "expected results"],
  },
  tools: {
    key: "tools",
    label: "Tools",
    dimensionKeys: ["power", "durability", "precision", "safety", "warranty", "portability", "value"],
    dimensionLabels: ["Power", "Durability", "Precision", "Safety", "Warranty", "Portability", "Value"],
    vocabulary: ["power", "durability", "precision", "safety", "warranty", "tools"],
    reasoningFocus: ["power output", "durability", "precision", "safety rating"],
  },
  dynamic: {
    key: "dynamic",
    label: "Product",
    dimensionKeys: ["quality", "value", "trust", "fit", "durability"],
    dimensionLabels: ["Quality", "Value", "Trust", "Fit", "Durability"],
    vocabulary: ["quality", "value", "trust", "fit", "durability"],
    reasoningFocus: ["product quality", "value position", "trust signals", "query fit"],
  },
};

export function resolveCategoryProfileKey(
  segment: ProductIntelligenceSegment | null,
  productTitle: string,
  searchQuery = ""
): CategoryProfileKey {
  const blob = `${productTitle} ${searchQuery}`.toLowerCase();

  if (segment === "phones" || /\b(iphone|smartphone|galaxy s|pixel)\b/i.test(blob)) return "phones";
  if (segment === "laptops" || /\b(laptop|macbook|notebook|ultrabook)\b/i.test(blob)) return "laptops";
  if (segment === "sofas" || /\b(sofa|couch|sectional|hoekbank)\b/i.test(blob)) return "sofas";
  if (segment === "headphones" || /\b(headphone|earbud|airpods|headset)\b/i.test(blob)) return "headphones";
  if (/\b(washer|dryer|fridge|refrigerator|dishwasher|oven|appliance)\b/i.test(blob)) return "appliances";
  if (/\b(dress|shirt|jacket|sneaker|shoe|fashion|apparel)\b/i.test(blob)) return "fashion";
  if (/\b(running|gym|fitness|yoga|sports|bike|bicycle)\b/i.test(blob)) return "sports";
  if (/\b(skincare|makeup|serum|moisturizer|beauty|cosmetic)\b/i.test(blob)) return "beauty";
  if (/\b(drill|saw|wrench|toolbox|power tool|dewalt|makita)\b/i.test(blob)) return "tools";
  if (/\b(rug|lamp|curtain|bedding|decor|home)\b/i.test(blob)) return "home";

  return segment === "dynamic" || !segment ? "dynamic" : (segment as CategoryProfileKey);
}

export function getCategoryProfile(key: CategoryProfileKey): CategoryProfileSpec {
  return REGISTRY[key] ?? REGISTRY.dynamic;
}

export function getCategoryProfileVocabulary(key: CategoryProfileKey): string[] {
  return getCategoryProfile(key).vocabulary;
}

export function listCategoryProfileKeys(): CategoryProfileKey[] {
  return Object.keys(REGISTRY) as CategoryProfileKey[];
}
