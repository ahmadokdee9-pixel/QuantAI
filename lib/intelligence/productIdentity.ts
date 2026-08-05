/**
 * QuantAI canonical product identity — cross-retailer matching spine (intelligence layer).
 */

import type { QuantProduct } from "@/lib/shoppingScore";
import { extractProductIdentity, type ProductIdentity } from "@/lib/deals/productIdentity";
import { identityMatchScore } from "@/lib/deals/identityMatchScore";
import type { CanonicalQueryContract } from "@/lib/search/canonicalQuery";
import {
  hasLuxuryWatchIntent,
  isConsumerFitnessWatchListing,
  isLuxuryWatchListingEvidence,
} from "@/lib/search/luxuryWatchIntent";
import { isProtectedExactSkuQuery, isRelaxedIdentityLane } from "@/lib/search/searchIntentModes";
import type { QiListingIdentity } from "@/lib/intelligence/listingIdentityTypes";
import { normalizeCommercialRoles } from "@/lib/intelligence/normalizeIntelligenceSignals";
import { assessModelGenerationConflict } from "@/lib/intelligence/modelGenerationGuard";
import {
  normalizeColorKey,
  normalizeConditionLabel,
  normalizeRegionalTitleNoise,
  normalizeSizeKey,
  normalizeStorageGb,
} from "@/lib/intelligence/variantNormalization";

export type CanonicalProductIdentity = {
  /** Stable family key within tray */
  canonicalKey: string;
  brandKey: string;
  modelKey: string;
  variantFingerprint: string;
  condition: ReturnType<typeof normalizeConditionLabel>;
  normalizedTitleHint: string;
};

export type StructuredIdentityRelation =
  | "exact_product"
  | "same_product_family"
  | "variant"
  | "accessory"
  | "compatible_item"
  | "replacement_part"
  | "bundle"
  | "refurbished_used"
  | "fake_placeholder"
  | "wrong_product"
  | "unknown";

export type StructuredProductIdentity = {
  relation: StructuredIdentityRelation;
  confidence01: number;
  isMainProduct: boolean;
  isSafeSameFamilyCandidate: boolean;
  reasons: string[];
  brandKey: string;
  modelKey: string;
  variantFingerprint: string;
};

export type IdentityGateDecision = {
  identityGatePassed: boolean;
  exactMatchPassed: boolean;
  exclusionReason: string | null;
  identityConfidence: number;
  fusionConfidence: number;
  relation: StructuredIdentityRelation;
  reasons: string[];
};

export type IdentityGateOptions = {
  /** External/live rows must be clean even for broad or unknown categories. */
  strictExternalDiscovery?: boolean;
  /** Unknown categories may enter discovery, but need stronger title identity evidence. */
  unknownCategoryMode?: boolean;
  /** Category/broad discovery can keep safe same-family market rows behind exact matches. */
  allowMarketFamily?: boolean;
};

/** Collapse brand + primary model tokens for identity keys. */
export function normalizeBrandModel(identity: ProductIdentity): { brandKey: string; modelKey: string } {
  const brandKey = (identity.brands[0] ?? "unknown").toLowerCase();
  const models = [...identity.models].map((m) => m.toLowerCase().replace(/\s+/g, "")).sort();
  const modelKey = models.slice(0, 3).join("+") || identity.normalizedTitle.slice(0, 48).replace(/\s+/g, "_");
  return { brandKey, modelKey };
}

/** Storage + color + size + condition — same real product variants. */
export function extractVariantFingerprint(p: QuantProduct, identity: ProductIdentity): string {
  const blob = `${p.title} ${p.extensions.join(" ")} ${p.availability ?? ""}`;
  const parts: string[] = [];
  const gb = normalizeStorageGb(blob);
  if (gb != null) parts.push(`s${gb}`);
  const c = normalizeColorKey(blob);
  if (c) parts.push(`c${c}`);
  const sz = normalizeSizeKey(blob);
  if (sz) parts.push(`z${sz}`);
  for (const [k, v] of Object.entries(identity.specHints)) {
    parts.push(`${k}:${v.replace(/\s+/g, "")}`);
  }
  parts.push(`cond:${normalizeConditionLabel(blob)}`);
  return parts.sort().join("|");
}

export function createCanonicalProductIdentity(p: QuantProduct): CanonicalProductIdentity {
  const id = extractProductIdentity(p);
  const { brandKey, modelKey } = normalizeBrandModel(id);
  const variantFingerprint = extractVariantFingerprint(p, id);
  const blob = `${p.title} ${p.extensions.join(" ")}`;
  const condition = normalizeConditionLabel(blob);
  const normalizedTitleHint = normalizeRegionalTitleNoise(id.normalizedTitle).slice(0, 96);
  const canonicalKey = [brandKey, modelKey, variantFingerprint].join("::");
  return {
    canonicalKey,
    brandKey,
    modelKey,
    variantFingerprint,
    condition,
    normalizedTitleHint,
  };
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

function listingBlob(p: QuantProduct): string {
  return `${p.title} ${Array.isArray(p.extensions) ? p.extensions.join(" ") : ""} ${p.availability ?? ""}`.toLowerCase();
}

function queryAllowsAccessory(canonicalQuery?: CanonicalQueryContract): boolean {
  const q = canonicalQuery?.originalQuery.toLowerCase() ?? "";
  return /\b(case|cover|hoesje|protector|charger|cable|adapter|strap|band|screenprotector)\b/i.test(q);
}

function exactCoreProductIntent(canonicalQuery?: CanonicalQueryContract): boolean {
  if (!canonicalQuery || queryAllowsAccessory(canonicalQuery)) return false;
  if (isRelaxedIdentityLane(canonicalQuery)) return false;
  const q = canonicalQuery.originalQuery.toLowerCase();
  const protectedExact = isProtectedExactSkuQuery(canonicalQuery) || /(iphone|ايفون|آيفون|airpods?|ايربودز|adidas\s+samba|samba)/i.test(q);
  if (canonicalQuery.marketMode === "category_shopping" || canonicalQuery.marketMode === "broad_discovery") return false;
  if (canonicalQuery.marketMode === "hybrid_compare") {
    if (canonicalQuery.intent.primary === "alternative") return false;
    return protectedExact;
  }
  if (canonicalQuery.marketMode === "exact_sku") return protectedExact || Boolean(canonicalQuery.brand && canonicalQuery.model && !canonicalQuery.semantic.alternativeIntent.active);
  const broadCoreCategory =
    (canonicalQuery.category === "electronics" || canonicalQuery.category === "furniture") &&
    !canonicalQuery.brand &&
    !canonicalQuery.model;
  if (broadCoreCategory) return false;
  return (
    protectedExact ||
    canonicalQuery.intent.primary === "exact_product" ||
    canonicalQuery.intent.primary === "best_value" ||
    canonicalQuery.intent.primary === "cheapest_trusted" ||
    canonicalQuery.intent.primary === "premium"
  );
}

function weakTitleJunk(product: QuantProduct): boolean {
  const title = product.title.trim().toLowerCase();
  if (title.length < 10) return true;
  if (/^(product|item|unknown|untitled|no title|listing)$/i.test(title)) return true;
  if (/\b(lorem|placeholder|test listing|sample title|no image yet)\b/i.test(title)) return true;
  return false;
}

function explicitVariantEvidence(identity: StructuredProductIdentity): boolean {
  const hasModel = identity.reasons.includes("model_or_identifier_evidence") || identity.reasons.includes("identifier_evidence");
  const variantParts = identity.variantFingerprint
    .split("|")
    .filter((part) => part && part !== "cond:unknown" && part !== "cond:new");
  return hasModel && variantParts.length > 0;
}

function tokenSet(s: string): string[] {
  return Array.from(new Set(s.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) ?? []));
}

function productEvidenceScore(product: QuantProduct, canonicalQuery?: CanonicalQueryContract): number {
  if (!canonicalQuery) return 0.5;
  const text = listingBlob(product);
  const identityTerms = [
    canonicalQuery.brand,
    canonicalQuery.model,
    canonicalQuery.variant,
    canonicalQuery.productType,
    canonicalQuery.category !== "unknown" ? canonicalQuery.category : "",
    ...canonicalQuery.semantic.semanticKeywords.slice(0, 8),
  ].filter((x): x is string => Boolean(x && x.trim()));
  const terms = Array.from(new Set(identityTerms.flatMap(tokenSet))).filter((t) => !/^(best|cheap|deal|trusted|safe|buy|voor)$/.test(t));
  if (!terms.length) return 0.45;
  const hits = terms.filter((term) => text.includes(term)).length;
  return clamp01(hits / Math.min(5, terms.length));
}

function relationFromCommercialText(blob: string): { relation: StructuredIdentityRelation | null; reasons: string[] } {
  const reasons: string[] = [];
  if (/\b(dummy|placeholder|prop phone|fake shell|box only|empty box|display dummy|non[-\s]?functional|mockups?|commercial use license|digital download)\b/i.test(blob)) {
    reasons.push("placeholder_or_non_functional_listing");
    return { relation: "fake_placeholder", reasons };
  }
  if (/\b(for parts|replacement part|spare part|screen replacement|battery replacement|camera lens replacement|sim tray|sim card tray|charging port|logic board|motherboard)\b/i.test(blob)) {
    reasons.push("replacement_or_parts_language");
    return { relation: "replacement_part", reasons };
  }
  if (/\b(compatible with|made for|for iphone|for galaxy|for airpods|voor iphone|voor galaxy|fits)\b/i.test(blob)) {
    reasons.push("compatible_with_language");
    return { relation: "compatible_item", reasons };
  }
  if (/\b(case only|cover only|charging case|protective case|wallet case|phone case|airpods case|hoesje|screen protector|tempered glass|charger|charging cable|usb[-\s]?c cable|adapter)\b/i.test(blob)) {
    reasons.push("accessory_language");
    return { relation: "accessory", reasons };
  }
  if (/\b(bundle|set|kit|with case|with charger|starter pack)\b/i.test(blob)) {
    reasons.push("bundle_language");
    return { relation: "bundle", reasons };
  }
  if (/\b(refurbished|renewed|restored|used|second[-\s]?hand|pre[-\s]?owned|occasion|gereviseerd|مستعمل|مستعملة)\b/i.test(blob)) {
    reasons.push("used_or_refurbished_language");
    return { relation: "refurbished_used", reasons };
  }
  return { relation: null, reasons };
}

function hasModelEvidence(
  identity: ProductIdentity,
  canonicalQuery?: CanonicalQueryContract,
  listingBlobText?: string
): boolean {
  const modelRaw = canonicalQuery?.model?.toLowerCase().trim() ?? "";
  const model = modelRaw.replace(/\s+/g, "");
  if (!model) return identity.models.length > 0 || identity.identifiers.length > 0;
  const identityModels = identity.models.map((m) => m.toLowerCase().replace(/\s+/g, ""));
  const iphoneVersion = model.match(/^iphone(\d{1,2})(?:pro|max|plus|mini|e)?$/)?.[1];
  if (iphoneVersion) {
    return identityModels.some((m) => m === model || m.startsWith(`iphone${iphoneVersion}`));
  }
  if (
    identityModels.some((m) => {
      if (/^\d{1,3}(gb|tb)?$/.test(m)) return false;
      return m.includes(model) || model.includes(m);
    })
  ) {
    return true;
  }
  // Fallback: listing title/blob carries model tokens (e.g. "Pegasus 41", "V15").
  const blob = String(listingBlobText || "").toLowerCase();
  if (!blob) return false;
  const tokens = modelRaw.split(/\s+/).filter((t) => t.length >= 1 && !/^(nike|adidas|dyson|apple|samsung)$/i.test(t));
  if (tokens.length === 0) return false;
  return tokens.every((t) => blob.includes(t));
}

function hasBrandEvidence(identity: ProductIdentity, canonicalQuery?: CanonicalQueryContract): boolean {
  const brand = canonicalQuery?.brand?.toLowerCase();
  if (!brand) return identity.brands.length > 0;
  return identity.brands.some((b) => b === brand || (brand === "apple" && b === "apple") || b.includes(brand));
}

function categoryEvidence(p: QuantProduct, canonicalQuery?: CanonicalQueryContract): boolean {
  const category = canonicalQuery?.category;
  if (!category || category === "unknown") return true;
  const blob = listingBlob(p);
  const query = canonicalQuery.originalQuery.toLowerCase();
  if (category === "phone") return /\b(phone|iphone|galaxy|pixel|smartphone|mobile|telefoon|mobiel)\b/i.test(blob);
  if (category === "audio") return /\b(airpods?|earbuds?|headphones?|wireless audio|noise cancelling|koptelefoon|oordopjes|oortjes)\b/i.test(blob);
  if (category === "shoes") {
    if (/\b(running\s+shoe|flat\s+feet|stability\s+shoe|overpronation)\b/i.test(query)) {
      return /\b(running|trainer|sneaker|stability|support|overpronation|gel|kayano|ghost|pegasus|structure|motion|beast|adrenaline)\b/i.test(blob);
    }
    return /\b(shoe|sneaker|trainer|samba|gazelle|air force|adidas|nike)\b/i.test(blob);
  }
  if (category === "furniture") {
    if (/(?:كرسي|كراسي|كرسي\s*مكتب)/i.test(query)) {
      return /(?:كرسي|chair|stoel|office|desk|kantoor|ergonomic|gaming\s+chair)/i.test(blob);
    }
    if (/\b(sofa|couch|sectional|loveseat|settee|hoekbank|bankstel|loungebank)\b|كنبة/i.test(query)) {
      return /\b(sofa|sofa bed|sectional|loveseat|settee|couch|corner sofa|recliner|chaise|hoekbank|bankstel|loungebank|fauteuil|bank)\b|كنبة/i.test(blob);
    }
    if (/\b(table|tafel|garden table|tuin tafel)\b|طاولة/i.test(query)) {
      return /\b(table|tafel|tuinset|tuinmeubel|loungeset)\b|طاولة/i.test(blob);
    }
    return /\b(sofa|sofa bed|sectional|loveseat|settee|couch|corner sofa|recliner|chaise|hoekbank|bankstel|loungebank|fauteuil|chair|stoel|table|tafel|tuinset|tuinmeubel|loungeset|furniture|meubel|meubels|كنبة|طاولة)\b/i.test(blob);
  }
  if (category === "electronics") {
    if (/\b(standing\s+desk|sit[-\s]?stand|height\s+adjustable|electric\s+desk)\b/i.test(query)) {
      return /\b(standing\s+desk|sit[-\s]?stand|height\s+adjustable|electric\s+desk|desk\s+frame|bureau|workstation)\b/i.test(blob);
    }
    if (/\b(gaming\s+headset|wireless\s+gaming|ps5\s+headset)\b/i.test(query)) {
      return (
        /\b(gaming\s+headset|headset|headphones?|koptelefoon|arctis|pulse|cloud|void|blackshark|g\s*pro)\b/i.test(blob) ||
        (/\b(wireless|bluetooth)\b/i.test(blob) && /\b(ps5|playstation)\b/i.test(blob))
      );
    }
    if (/\b(mechanical\s+keyboard)\b/i.test(query)) {
      return /\b(mechanical\s+keyboard|keyboard|keycap|switch)\b/i.test(blob);
    }
    if (/\b(monitor\s+arm|dual\s+monitor|desk\s+mount)\b/i.test(query)) {
      return /\b(monitor\s+arm|desk\s+mount|mount|stand|vesa)\b/i.test(blob);
    }
    if (/\b(desk\s+organizer|cable\s+management)\b/i.test(query)) {
      return /\b(organizer|cable\s+management|desk\s+tray|grommet|cord)\b/i.test(blob);
    }
    if (/\b(rtx|gtx|geforce|graphics\s+card|gpu)\b/i.test(query)) {
      return /\b(gpu|graphics|geforce|rtx|gtx|video\s+card)\b/i.test(blob);
    }
    if (/\b(gaming\s+monitor|\d+\s*hz)\b/i.test(query)) {
      return /\b(monitor|beeldscherm|display|\d+\s*hz)\b/i.test(blob);
    }
    return /\b(monitor|display|beeldscherm|scherm|gpu|camera|tablet|console|tv|keyboard|headset|electronics?)\b/i.test(blob);
  }
  if (category === "fragrance") {
    const perfumeCue = /\b(perfume|fragrance|parfum|cologne|eau de parfum|eau de toilette|عطر)\b/i.test(blob);
    if (/\b(libre)\b/i.test(query)) {
      return perfumeCue && /\b(libre|yves|saint\s+laurent|ysl)\b/i.test(blob);
    }
    if (/\b(ysl|yves\s+saint\s+laurent)\b/i.test(query)) {
      return perfumeCue && /\b(yves|saint\s+laurent|ysl|libre)\b/i.test(blob);
    }
    return perfumeCue;
  }
  if (category === "fashion") return /\b(jacket|jas|coat|hoodie|shirt|dress|fashion|kleding)\b/i.test(blob);
  if (category === "home") {
    if (/\b(robot vacuum|robotstofzuiger|stofzuiger robot|roomba|roborock|irobot)\b/i.test(query)) {
      return /\b(robot vacuum|robotstofzuiger|stofzuiger robot|roomba|roborock|irobot|dreame|ecovacs|deebot|eufy|shark|xiaomi|stofzuiger)\b/i.test(blob);
    }
    // Stick/cordless vacuums (e.g. Dyson V15) — English titles often omit the word "vacuum".
    if (/\b(dyson)\b/i.test(query) && /\b(v\d{1,2}|vacuum|stofzuiger|detect|cordless)\b/i.test(query)) {
      return /\b(dyson|v\d{1,2}|vacuum|stofzuiger|steelstofzuiger|detect|absolute|complete|cordless|stick)\b/i.test(blob);
    }
    if (/\b(baby stroller|stroller|pram|buggy|kinderwagen)\b|عربة/i.test(query)) {
      return /\b(baby stroller|stroller|pram|buggy|pushchair|car seat|kinderwagen|bugaboo|cybex|joolz|uppababy|maxi[-\s]?cosi|babypark|prenatal)\b|عربة/i.test(blob);
    }
    if (/\b(coffee machine|espresso machine|koffiemachine|koffiezetapparaat)\b/i.test(query)) {
      return /\b(coffee|espresso|koffie|machine|keurig|nespresso|delonghi|sage|jura|philips|krups)\b/i.test(blob);
    }
    if (/\b(air fryer|airfryer|fryer|friteuse|heteluchtfriteuse)\b/i.test(query)) {
      return /\b(air fryer|airfryer|fryer|friteuse|heteluchtfriteuse|ninja|philips|tefal|cosori)\b/i.test(blob);
    }
    return /\b(home|kitchen|coffee|machine|espresso|koffie|air fryer|airfryer|fryer|heteluchtfriteuse|friteuse|appliance|robot vacuum|robotstofzuiger|stofzuiger|steelstofzuiger|roomba|roborock|irobot|dyson|stroller|pram|buggy|kinderwagen|babypark|prenatal|huis|keuken|apparaat|عربة)\b/i.test(blob);
  }
  if (category === "watch") {
    const watchCue = /\b(watch|horloge|wristwatch|timepiece|chronograph)\b/i.test(blob);
    if (!watchCue) return false;
    if (hasLuxuryWatchIntent(query)) {
      if (isConsumerFitnessWatchListing(blob) && !isLuxuryWatchListingEvidence(blob)) return false;
      return true;
    }
    return /\b(watch|smartwatch|horloge|wearable|wrist)\b/i.test(blob);
  }
  return true;
}

export function assessStructuredProductIdentity(args: {
  product: QuantProduct;
  canonicalQuery?: CanonicalQueryContract;
  listingIdentity?: QiListingIdentity | null;
}): StructuredProductIdentity {
  const { product, canonicalQuery, listingIdentity } = args;
  const identity = extractProductIdentity(product);
  const canonical = createCanonicalProductIdentity(product);
  const blob = listingBlob(product);
  const reasons: string[] = [];
  const commercial = relationFromCommercialText(blob);
  reasons.push(...commercial.reasons);

  const roles = normalizeCommercialRoles(listingIdentity?.commercialRoles);
  const accessoryRisk = listingIdentity?.accessoryLikelihood01 ?? 0;
  const contaminationRisk = listingIdentity?.contaminationRisk01 ?? 0;
  const mismatch = listingIdentity?.semanticMismatchPenalty01 ?? 0;

  let relation = commercial.relation;
  if (!relation && roles.includes("replacement_part")) {
    relation = "replacement_part";
    reasons.push("ontology_replacement_part");
  }
  if (!relation && (roles.includes("accessory") || roles.includes("charging_case_component") || roles.includes("single_audio_piece"))) {
    relation = "accessory";
    reasons.push("ontology_accessory_or_component");
  }
  if (!relation && (roles.includes("used_inventory") || roles.includes("refurbished_inventory"))) {
    relation = "refurbished_used";
    reasons.push("ontology_used_or_refurbished");
  }
  if (!relation && roles.includes("bundle_listing")) {
    relation = "bundle";
    reasons.push("ontology_bundle");
  }
  if (!relation && (roles.includes("replica_risk") || roles.includes("packaging_only"))) {
    relation = "fake_placeholder";
    reasons.push("ontology_fake_or_packaging_only");
  }
  if (!relation && accessoryRisk >= 0.68) {
    relation = "accessory";
    reasons.push("high_accessory_likelihood");
  }

  const brand = hasBrandEvidence(identity, canonicalQuery);
  const model = hasModelEvidence(identity, canonicalQuery, blob);
  const category = categoryEvidence(product, canonicalQuery);
  if (brand) reasons.push("brand_evidence");
  if (model) reasons.push("model_or_identifier_evidence");
  if (category) reasons.push("category_evidence");
  if (identity.identifiers.length > 0) reasons.push("identifier_evidence");

  if (!relation) {
    if (!category && canonicalQuery?.category !== "unknown") relation = "wrong_product";
    else if (brand && model) relation = "exact_product";
    else if (brand || model || category) relation = "same_product_family";
    else relation = "unknown";
  }

  const accessoryAllowed = queryAllowsAccessory(canonicalQuery);
  const isAccessoryLike = relation === "accessory" || relation === "compatible_item" || relation === "replacement_part";
  const isBad = relation === "fake_placeholder" || relation === "wrong_product";
  const isMainProduct =
    !isBad &&
    (!isAccessoryLike || accessoryAllowed) &&
    relation !== "replacement_part" &&
    contaminationRisk < 0.7 &&
    mismatch < 0.72;
  const exactEvidence = relation === "exact_product" || (brand && model) || identity.identifiers.length > 0;
  const isSafeSameFamilyCandidate =
    isMainProduct &&
    exactEvidence &&
    listingIdentity?.productCompleteness !== "accessory_only" &&
    listingIdentity?.productCompleteness !== "parts_or_subassembly";

  let confidence01 = 0.34;
  if (category) confidence01 += 0.14;
  if (brand) confidence01 += 0.16;
  if (model) confidence01 += 0.2;
  if (identity.identifiers.length > 0) confidence01 += 0.18;
  if (relation === "variant" || relation === "bundle" || relation === "refurbished_used") confidence01 += 0.04;
  if (isAccessoryLike && !accessoryAllowed) confidence01 -= 0.24;
  if (isBad) confidence01 -= 0.3;
  confidence01 -= contaminationRisk * 0.16 + mismatch * 0.12;

  const gen = assessModelGenerationConflict(product, canonicalQuery);
  if (gen.conflict) {
    confidence01 -= gen.severity01 * 0.22;
    reasons.push(gen.reason ?? "generation_mismatch");
    if (gen.severity01 >= 0.8 && relation === "exact_product") relation = "same_product_family";
  }

  return {
    relation,
    confidence01: clamp01(confidence01),
    isMainProduct,
    isSafeSameFamilyCandidate,
    reasons: [...new Set(reasons)].slice(0, 8),
    brandKey: canonical.brandKey,
    modelKey: canonical.modelKey,
    variantFingerprint: canonical.variantFingerprint,
  };
}

export function sameStructuredIdentityFamily(
  a: StructuredProductIdentity,
  b: StructuredProductIdentity
): { ok: boolean; reason: string } {
  if (!a.isSafeSameFamilyCandidate || !b.isSafeSameFamilyCandidate) {
    return { ok: false, reason: "unsafe_identity_candidate" };
  }
  if (a.brandKey !== "unknown" && b.brandKey !== "unknown" && a.brandKey !== b.brandKey) {
    return { ok: false, reason: "brand_conflict" };
  }
  if (a.modelKey && b.modelKey && a.modelKey !== b.modelKey) {
    return { ok: false, reason: "model_conflict" };
  }
  return { ok: true, reason: "strong_brand_model_identity" };
}

export function buildIdentityDebugSummary(
  products: QuantProduct[],
  canonicalQuery?: CanonicalQueryContract
): Record<string, unknown> {
  const rows = products.slice(0, 12).map((product) => {
    const id = assessStructuredProductIdentity({
      product,
      canonicalQuery,
      listingIdentity: product.qiListingIdentity ?? null,
    });
    return {
      title: product.title.slice(0, 120),
      store: product.store,
      relation: id.relation,
      confidence01: Number(id.confidence01.toFixed(2)),
      identityGatePassed: product.qiIdentityGate?.identityGatePassed ?? null,
      exactMatchPassed: product.qiIdentityGate?.exactMatchPassed ?? null,
      exclusionReason: product.qiIdentityGate?.exclusionReason ?? null,
      identityConfidence: product.qiIdentityGate?.identityConfidence ?? Number(id.confidence01.toFixed(2)),
      fusionConfidence: product.qiIdentityGate?.fusionConfidence ?? null,
      isMainProduct: id.isMainProduct,
      isSafeSameFamilyCandidate: id.isSafeSameFamilyCandidate,
      reasons: id.reasons,
    };
  });
  const counts = rows.reduce<Record<string, number>>((acc, row) => {
    const key = String(row.relation);
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
  return { counts, topRows: rows };
}

export function assessIdentityGateDecision(
  product: QuantProduct,
  canonicalQuery?: CanonicalQueryContract,
  options: IdentityGateOptions = {}
): IdentityGateDecision {
  if (
    product.qiIdentityGate?.identityGatePassed &&
    product.qiIdentityGate.exactMatchPassed &&
    product.qiIdentityGate.fusionConfidence >= 0.68
  ) {
    return product.qiIdentityGate;
  }
  const exactIntent = exactCoreProductIntent(canonicalQuery);
  const identity = assessStructuredProductIdentity({
    product,
    canonicalQuery,
    listingIdentity: product.qiListingIdentity ?? null,
  });
  const title = listingBlob(product);
  const evidence01 = productEvidenceScore(product, canonicalQuery);
  const variantOk = identity.relation === "variant" && identity.confidence01 >= 0.78 && explicitVariantEvidence(identity);
  const marketFamilyPassed = Boolean(
    options.allowMarketFamily &&
      identity.isMainProduct &&
      (
        identity.relation === "same_product_family" ||
        identity.relation === "variant" ||
        identity.relation === "bundle" ||
        (identity.relation === "unknown" && evidence01 >= (options.unknownCategoryMode ? 0.62 : 0.5))
      ) &&
      identity.confidence01 >= (options.unknownCategoryMode ? 0.58 : 0.32)
  );
  const exactMatchPassed = Boolean(
    identity.relation === "exact_product" ||
    identity.isSafeSameFamilyCandidate ||
    variantOk ||
    (options.unknownCategoryMode && identity.isMainProduct && evidence01 >= 0.64 && identity.confidence01 >= 0.68)
  );
  const fusionConfidence = clamp01(identity.confidence01 * 0.68 + evidence01 * 0.32);
  let exclusionReason: string | null = null;

  if (weakTitleJunk(product)) exclusionReason = "weak_title_junk";
  if (!exclusionReason && identity.relation === "fake_placeholder") exclusionReason = "fake_placeholder";
  if (!exclusionReason && identity.relation === "wrong_product") exclusionReason = "wrong_product";

  if (!exclusionReason && (exactIntent || options.strictExternalDiscovery)) {
    const familyFloor = options.allowMarketFamily ? (options.unknownCategoryMode ? 0.62 : 0.32) : 0.72;
    if (identity.relation === "accessory") exclusionReason = "accessory_for_exact_product";
    else if (identity.relation === "compatible_item") exclusionReason = "compatible_item_for_exact_product";
    else if (identity.relation === "replacement_part") exclusionReason = "replacement_part_for_exact_product";
    else if (identity.relation === "bundle" && !options.allowMarketFamily) exclusionReason = "bundle_not_exact_product";
    else if (identity.relation === "refurbished_used" && canonicalQuery?.condition === "any") exclusionReason = "used_or_refurbished_noise";
    else if (
      canonicalQuery?.category === "phone" &&
      /\biphone\b/i.test(title) &&
      !/\bapple\b/i.test(title) &&
      !/\b(64|128|256|512)\s?gb\b/i.test(title)
    ) {
      exclusionReason = "phone_exact_missing_device_evidence";
    } else if (canonicalQuery?.category === "shoes" && /\b(cap|hat|socks|hoodie|shirt|shorts|bag|backpack)\b/i.test(title)) {
      exclusionReason = "shoe_query_apparel_or_accessory";
    } else if (/\b(case|cover|replacement|for iphone|used parts|bundle|sim tray|charger|cable)\b/i.test(title)) {
      exclusionReason = "exact_product_protected_term";
    } else if (identity.relation === "same_product_family" && (exactIntent || fusionConfidence < familyFloor)) {
      exclusionReason = "same_family_not_exact_product";
    } else if (identity.relation === "variant" && !variantOk && !options.allowMarketFamily) {
      exclusionReason = "weak_variant_identity";
    }
  }

  if (!exclusionReason && options.strictExternalDiscovery && !exactMatchPassed && !marketFamilyPassed) {
    exclusionReason = "external_identity_not_strong_enough";
  }
  if (!exclusionReason && options.unknownCategoryMode && fusionConfidence < (options.allowMarketFamily ? 0.58 : 0.72)) {
    exclusionReason = "unknown_category_weak_identity";
  }

  return {
    identityGatePassed: !exclusionReason,
    exactMatchPassed,
    exclusionReason,
    identityConfidence: Number(identity.confidence01.toFixed(2)),
    fusionConfidence: Number(fusionConfidence.toFixed(2)),
    relation: identity.relation,
    reasons: identity.reasons,
  };
}

export function applyHardIdentityGate(
  products: QuantProduct[],
  canonicalQuery?: CanonicalQueryContract
): QuantProduct[] {
  if (!products.length) return products;

  if (isRelaxedIdentityLane(canonicalQuery)) {
    const allowAccessory = queryAllowsAccessory(canonicalQuery);
    const out: QuantProduct[] = [];
    for (const product of products) {
      const decision = assessIdentityGateDecision(product, canonicalQuery);
      if (decision.relation === "fake_placeholder" || decision.relation === "wrong_product") continue;
      if (weakTitleJunk(product)) continue;
      if (
        !allowAccessory &&
        (decision.relation === "accessory" ||
          decision.relation === "compatible_item" ||
          decision.relation === "replacement_part")
      ) {
        const cat = canonicalQuery?.category;
        if (cat === "shoes" || cat === "phone" || cat === "audio" || cat === "watch") continue;
      }
      out.push({ ...product, qiIdentityGate: { ...decision, identityGatePassed: true } });
    }
    return out.map((p, i) => ({ ...p, qiRank: i }));
  }

  const exactIntent = exactCoreProductIntent(canonicalQuery);
  const passed: QuantProduct[] = [];
  const delayed: QuantProduct[] = [];
  const breadthSafeReasons = new Set([
    "same_family_not_exact_product",
    "weak_variant_identity",
    "used_or_refurbished_noise",
  ]);

  for (const product of products) {
    const decision = assessIdentityGateDecision(product, canonicalQuery);
    const withGate: QuantProduct = {
      ...product,
      qiIdentityGate: decision,
    };

    if (decision.identityGatePassed) passed.push(withGate);
    else if (decision.exclusionReason === "fake_placeholder" || decision.exclusionReason === "weak_title_junk" || decision.exclusionReason === "wrong_product") {
      continue;
    } else {
      delayed.push(withGate);
    }
  }

  if (!exactIntent) return [...passed, ...delayed].map((p, i) => ({ ...p, qiRank: i }));
  const safeBreadth = delayed.filter((p) => {
    const gate = p.qiIdentityGate;
    if (!gate?.exclusionReason || !breadthSafeReasons.has(gate.exclusionReason) || gate.fusionConfidence < 0.64) return false;
    if (canonicalQuery?.model && !gate.reasons.includes("model_or_identifier_evidence") && gate.fusionConfidence < 0.72) return false;
    return true;
  });
  if (passed.length > 0) return [...passed, ...safeBreadth].map((p, i) => ({ ...p, qiRank: i }));
  const recoveryBreadth = delayed.filter((p) => {
    const gate = p.qiIdentityGate;
    if (!gate || gate.fusionConfidence < 0.64) return false;
    if (canonicalQuery?.model && !gate.reasons.includes("model_or_identifier_evidence") && gate.fusionConfidence < 0.72) return false;
    return ![
      "accessory",
      "compatible_item",
      "replacement_part",
      "bundle",
      "fake_placeholder",
      "wrong_product",
    ].includes(gate.relation);
  });
  return recoveryBreadth.map((p, i) => ({ ...p, qiRank: i }));
}

export function recoverSafeIdentityBreadth(
  products: QuantProduct[],
  canonicalQuery?: CanonicalQueryContract,
  limit = 12
): QuantProduct[] {
  const recovered: QuantProduct[] = [];
  for (const product of products) {
    const decision = assessIdentityGateDecision(product, canonicalQuery);
    if (decision.exclusionReason === "fake_placeholder" || decision.exclusionReason === "weak_title_junk") continue;
    if (["accessory", "compatible_item", "replacement_part", "bundle", "fake_placeholder", "wrong_product"].includes(decision.relation)) continue;
    const alternativeLane = canonicalQuery?.intent.primary === "alternative";
    const minRecoveryConfidence = alternativeLane ? 0.48 : canonicalQuery?.model ? 0.64 : 0.52;
    if (decision.fusionConfidence < minRecoveryConfidence) continue;
    if (
      canonicalQuery?.model &&
      !alternativeLane &&
      !decision.reasons.includes("model_or_identifier_evidence") &&
      decision.fusionConfidence < 0.72
    ) {
      continue;
    }
    recovered.push({
      ...product,
      qiIdentityGate: {
        ...decision,
        exclusionReason: decision.exclusionReason === "wrong_product" ? "safe_breadth_recovery" : decision.exclusionReason,
      },
    });
    if (recovered.length >= limit) break;
  }
  return recovered.map((p, i) => ({ ...p, qiRank: i }));
}

/** 0–1 confidence two rows are the same product (uses deals identity + price sanity). */
export function buildProductIdentityConfidence(
  a: QuantProduct,
  b: QuantProduct,
  identityA: ProductIdentity,
  identityB: ProductIdentity,
  peerMedianPrice: number
): number {
  return identityMatchScore(identityA, identityB, a.price, b.price, peerMedianPrice);
}

/** Same SKU across different storefronts (not duplicate listings on one store). */
export function detectCrossRetailIdentity(
  a: QuantProduct,
  b: QuantProduct,
  confidence01: number
): boolean {
  if (confidence01 < 0.72) return false;
  const sa = a.store.toLowerCase().trim();
  const sb = b.store.toLowerCase().trim();
  if (sa === sb) return confidence01 >= 0.88;
  return true;
}

export type { ProductIdentity };
