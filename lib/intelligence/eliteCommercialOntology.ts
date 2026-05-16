/**
 * QuantAI Elite Commercial Ontology — deterministic semantic buckets for “what this listing actually IS”
 * (device vs accessory vs part vs packaging vs bait grammar), separate from weak title overlap.
 */

function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0;
  return Math.min(1, Math.max(0, x));
}

export type CommercialRole =
  | "primary_product"
  | "accessory"
  | "replacement_part"
  | "charging_case_component"
  | "single_audio_piece"
  | "refurbished_inventory"
  | "used_inventory"
  | "bundle_listing"
  | "demo_or_display"
  | "replica_risk"
  | "packaging_only"
  | "ambiguous";

export type ProductCompletenessEstimate =
  | "complete_saleable_unit"
  | "accessory_only"
  | "parts_or_subassembly"
  | "bundle_unclear"
  | "unknown";

const KNOWN_COMMERCIAL_ROLE = new Set<string>([
  "primary_product",
  "accessory",
  "replacement_part",
  "charging_case_component",
  "single_audio_piece",
  "refurbished_inventory",
  "used_inventory",
  "bundle_listing",
  "demo_or_display",
  "replica_risk",
  "packaging_only",
  "ambiguous",
]);

/** Safe coercion for partial / malformed payloads — never undefined */
export function coerceCommercialRoles(value: unknown): CommercialRole[] {
  if (!Array.isArray(value)) return [];
  const out: CommercialRole[] = [];
  const seen = new Set<string>();
  for (const x of value) {
    if (typeof x !== "string") continue;
    const s = x.trim();
    if (!KNOWN_COMMERCIAL_ROLE.has(s)) continue;
    if (seen.has(s)) continue;
    seen.add(s);
    out.push(s as CommercialRole);
  }
  return out;
}

export type EliteCommercialOntology = {
  roles: CommercialRole[];
  completeness: ProductCompletenessEstimate;
  /** Higher ≈ reads like a complete device/SKU rather than add-on or scrap part */
  bundleIntegrity01: number;
  /** “for iPhone …”, “compatible with …” bait grammar vs unnamed hero SKU */
  pollutionGrammar01: number;
};

const ACCESSORY_STRONG =
  /\b(only\s+the\s+case|case\s+only|cover\s+only|skin\s+only|shell\s+only|protector\s+only|glass\s+only|strap\s+only|band\s+only|lace\s+only|laces\s+only|housing\s+only|replacement\s+(band|strap|lace|laces|cable|charger)|charging\s+cable\s+only|tempered\s+glass|screen\s+protector|camera\s+lens\s+protector|wallet\s+case|phone\s+case\s+for|hoesje\s+voor|cover\s+voor|sofa\s+cover|couch\s+cover|mattress\s+cover|slipcover\b|\bgpu\s+fan\b|\bvc\b\s*cooler\b|\bheatsink\s+only\b)\b/i;

const ACCESSORY_SOFT =
  /\b(case|cover|folio|bumper|hoesje|skin|protector|charger|cable|adapter|strap|band|laces\b|folie|screenprotector|screen\s+protect)\b/i;

const REPLACEMENT_PART =
  /\b(replacement\s+(part|panel|digitizer|screen\s+\(?lcd)|lcd\s+only|\bdigitizer\b|\bac\s+adapter\b\s*\(.* motherboard\b|\bmobo\b|\bback\s+glass\b|\bfront\s+glass\b|oem\s+part\b|\bbezel\b\s+only|ssd\s+heatsink|thermal\s+pad\s+kit|repair\s+part)\b/i;

const CHARGING_CASE_ONLY =
  /\b(charging\s+case\s+only|case\s+for\s+airpods|airpods\s+(?:pro\s+)?(?:charging\s+)?case\s+only|buds\s+case\s+only|earbud\s+case\s+without\s+(?:buds|earbuds))\b/i;

const SINGLE_AUDIO =
  /\b(left\s+(?:airpod|earbud|bud)|right\s+(?:airpod|earbud|bud)|single\s+(?:airpod|earbud|bud)|one\s+earbud\s+only|(?:lost|replace(?:ment)?)\s+(?:left|right)\s+(?:airpod|bud))\b/i;

const PACKAGING_TRAP =
  /\b(box\s+only|empty\s+box|without\s+(?:phone|device|console|tablet|gpu|graphics\s+card)|no\s+phone\b|box\s+and\s+manuals\s+only)\b/i;

const REPLICA_TRAP =
  /\b(replica|non\s*[-]?working\s+(?:iphone|phone)|dummy\s+(?:iphone|phone|handset)|clone\s+shell|fake\s+(?:iphone|airpods)|\b1\s*:\s*1\s+copy\b)\b/i;

const DEMO_DISPLAY =
  /\b(display\s+unit|floor\s+model|demo\s+unit|counter\s+model|shop\s+display|exhibit\s+model)\b/i;

const BUNDLE_HINT = /\b(bundle|combo|starter\s+kit|\d[-–]\s*in[-–]\s*\d|\bx\s*\d+\s*pieces?\b)\b/i;

const DEVICE_PRIMARY_HINT =
  /\b(unlocked|sim[\s-]?free|factory\s+sealed|brand\s+new\s+(?:iphone|galaxy|pixel|ipad|macbook)|(?:wifi|wi-fi)\s*[+|＋]\s*cellular)\b/i;

const POLLUTION_FOR_COMPATIBLE =
  /\b(for\s+(?:the\s+)?(?:new\s+)?(?:apple\s+)?(?:iphone|ipad|macbook|galaxy\s+s\d+|pixel\s+\d|switch\s+oled|airpods|playstation\s*\d|ps5|ps4|xbox))\b|\bcompatible\s+with\s+[a-z0-9][a-z0-9\s\-+/]{2,28}\b|\bfits\b\s+(?:the\s+)?(?:apple\s+)?(?:iphone|ipad|galaxy|macbook)\b/i;

/** Soft noun anchors — hero products shoppers mean vs attach-only grammar */
const PRIMARY_QUERY_PRODUCT_MARKERS =
  /\b(iphone|ipad|macbook|airpods|galaxy\s+s\d+|pixel\s+\d+|rtx\s*\d{3,4}|graphics\s+card|gpu\b|playstation|ps5|ps4|xbox|nintendo\s+switch|switch\s+oled|sofa|couch|sneakers?|shoes?)\b/i;

export function queryExplicitlyWantsAccessory(query: string): boolean {
  return /\b(case|cover|charger|cable|adapter|strap|band|protector|hoesje|lace|laces|screenprotector|screen\s+protect|fan\s+only|heatsink|replacement\s+part)\b/i.test(
    query
  );
}

/** Shopper is searching for the core SKU (handset, console, shoe, sofa …), not add-ons */
export function querySeeksPrimaryDeviceHero(query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q || queryExplicitlyWantsAccessory(query)) return false;
  return PRIMARY_QUERY_PRODUCT_MARKERS.test(q);
}

export function inferEliteCommercialOntology(normalizedTitle: string, blob: string): EliteCommercialOntology {
  const t = normalizedTitle.toLowerCase();
  const b = blob.toLowerCase();
  const roles = new Set<CommercialRole>();
  let completeness: ProductCompletenessEstimate = "unknown";
  let bundleIntegrity01 = 0.48;
  let pollutionGrammar01 = 0;

  if (REPLICA_TRAP.test(b)) {
    roles.add("replica_risk");
    bundleIntegrity01 = Math.min(bundleIntegrity01, 0.06);
  }

  if (PACKAGING_TRAP.test(b)) {
    roles.add("packaging_only");
    roles.add("accessory");
    completeness = "accessory_only";
    bundleIntegrity01 = Math.min(bundleIntegrity01, 0.05);
  }

  if (SINGLE_AUDIO.test(b)) {
    roles.add("single_audio_piece");
    completeness = "parts_or_subassembly";
    bundleIntegrity01 = Math.min(bundleIntegrity01, 0.14);
  }

  if (CHARGING_CASE_ONLY.test(b)) {
    roles.add("charging_case_component");
    roles.add("accessory");
    completeness = "accessory_only";
    bundleIntegrity01 = Math.min(bundleIntegrity01, 0.12);
  }

  if (REPLACEMENT_PART.test(b)) {
    roles.add("replacement_part");
    completeness = "parts_or_subassembly";
    bundleIntegrity01 = Math.min(bundleIntegrity01, 0.22);
  }

  if (ACCESSORY_STRONG.test(b) || (ACCESSORY_SOFT.test(b) && /\bonly\b|\bjust\s+the\b|\bnot\s+(?:the\s+)?(?:phone|device)\b/i.test(b))) {
    roles.add("accessory");
    if (completeness === "unknown") completeness = "accessory_only";
    bundleIntegrity01 = Math.min(bundleIntegrity01, 0.2);
  } else if (ACCESSORY_SOFT.test(b)) {
    roles.add("accessory");
    if (completeness === "unknown") completeness = "accessory_only";
    bundleIntegrity01 = Math.min(bundleIntegrity01, 0.38);
  }

  if (DEMO_DISPLAY.test(b)) {
    roles.add("demo_or_display");
    bundleIntegrity01 *= 0.62;
  }

  if (/\brefurb(?:ished)?|factory\s+renewed|renewed\s+by\b/i.test(b)) roles.add("refurbished_inventory");
  if (/\bused\b|second[\s-]?hand|pre[\s-]?owned/i.test(b)) roles.add("used_inventory");

  if (BUNDLE_HINT.test(b)) {
    roles.add("bundle_listing");
    if (completeness === "unknown") completeness = "bundle_unclear";
    bundleIntegrity01 = Math.max(bundleIntegrity01, 0.58);
  }

  if (POLLUTION_FOR_COMPATIBLE.test(b)) {
    pollutionGrammar01 = Math.max(pollutionGrammar01, 0.44);
    if (!roles.has("replacement_part")) pollutionGrammar01 += roles.has("accessory") ? 0.12 : 0.22;
  }

  const accessoryHeavy =
    roles.has("accessory") ||
    roles.has("replacement_part") ||
    roles.has("charging_case_component") ||
    roles.has("single_audio_piece") ||
    roles.has("packaging_only");

  if (!accessoryHeavy && (DEVICE_PRIMARY_HINT.test(b) || /\b\d{2,4}\s*gb\b|\b\d\s*tb\b|\boutdoor\s+camera\b|\blaptop\b|\btablet\b|\bconsole\b/i.test(t))) {
    roles.add("primary_product");
    if (completeness === "unknown") completeness = "complete_saleable_unit";
    bundleIntegrity01 = Math.max(bundleIntegrity01, 0.76);
  }

  if (roles.size === 0 || (!accessoryHeavy && completeness === "unknown")) {
    roles.add("ambiguous");
    bundleIntegrity01 = Math.max(bundleIntegrity01, 0.42);
  }

  return {
    roles: [...roles],
    completeness,
    bundleIntegrity01: clamp01(bundleIntegrity01),
    pollutionGrammar01: clamp01(pollutionGrammar01),
  };
}

export function accessoryLikelihoodFromOntology(o: EliteCommercialOntology): number {
  const roles = coerceCommercialRoles(o.roles);
  let s = 0;
  if (roles.includes("packaging_only")) s = Math.max(s, 0.88);
  if (roles.includes("charging_case_component")) s = Math.max(s, 0.74);
  if (roles.includes("single_audio_piece")) s = Math.max(s, 0.78);
  if (roles.includes("replacement_part")) s = Math.max(s, 0.68);
  if (roles.includes("accessory")) s = Math.max(s, 0.62);
  return clamp01(s);
}

/** Penalty when query seeks hero SKU but listing is accessory/part/bait grammar */
export function computeSemanticMismatchPenalty01(
  query: string,
  ontology: EliteCommercialOntology,
  titleAccessoryScore01: number
): number {
  if (!querySeeksPrimaryDeviceHero(query)) {
    return clamp01(titleAccessoryScore01 * 0.06);
  }
  let pen = 0;
  const roles = coerceCommercialRoles(ontology.roles);
  if (
    ontology.completeness === "accessory_only" ||
    ontology.completeness === "parts_or_subassembly"
  ) {
    pen += 0.58;
  }
  if (
    roles.includes("charging_case_component") ||
    roles.includes("single_audio_piece")
  ) {
    pen += 0.24;
  }
  if (roles.includes("packaging_only") || roles.includes("replica_risk")) {
    pen += 0.72;
  }
  pen += ontology.pollutionGrammar01 * 0.52;
  if (ontology.bundleIntegrity01 < 0.34 && !roles.includes("bundle_listing")) pen += 0.16;
  return clamp01(Math.max(pen, titleAccessoryScore01 * 0.82));
}

/** Tray firewall intensity — combines query contamination plane + ontology bait signals */
export function computeContaminationRisk01(
  ontology: EliteCommercialOntology,
  queryContaminant01: number,
  accessoryLikelihood01: number
): number {
  const roles = coerceCommercialRoles(ontology.roles);
  let r =
    queryContaminant01 * 0.42 +
    ontology.pollutionGrammar01 * 0.42 +
    accessoryLikelihood01 * 0.34;
  if (roles.includes("replica_risk") || roles.includes("packaging_only")) r += 0.38;
  if (roles.includes("demo_or_display")) r += 0.18;
  return clamp01(r);
}
