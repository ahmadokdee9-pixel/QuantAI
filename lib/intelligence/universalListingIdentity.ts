/**
 * QuantAI Universal Listing Identity vNext — canonical fingerprints, junk/accessory detection,
 * contamination hints for clustering and ranking (tray-local, deterministic).
 */

export type { ListingIdentityFlag, QiListingIdentity } from "@/lib/intelligence/listingIdentityTypes";

import type { ListingIdentityFlag, QiListingIdentity } from "@/lib/intelligence/listingIdentityTypes";
import type { QuantProduct } from "@/lib/shoppingScore";
import {
  isSpammyListingTitle,
  listingSignalsRefurbished,
  normalizeMarketplaceTitle,
} from "@/lib/commerce/listingQuality";
import { buildUniversalProductFingerprint, normalizeTitlesAcrossRetailers } from "@/lib/intelligence/universalIdentity";
import {
  accessoryLikelihoodFromOntology,
  computeContaminationRisk01,
  computeSemanticMismatchPenalty01,
  inferEliteCommercialOntology,
} from "@/lib/intelligence/eliteCommercialOntology";
import {
  isQiListingIdentityTrustworthy,
  normalizeQiListingIdentity,
} from "@/lib/intelligence/normalizeIntelligenceSignals";
import { queryListingRelevance01 } from "@/lib/intelligence/queryRelevance";

const ACCESSORY_TITLE =
  /\b(only\s+the\s+case|case\s+only|cover\s+only|skin\s+only|shell\s+only|protector\s+only|glass\s+only|strap\s+only|band\s+only|replacement\s+band|replacement\s+strap|charging\s+cable\s+only|usb[\s-]?c\s+cable|adapter\s+only|charger\s+plug\s+only|tempered\s+glass|screen\s+protector|camera\s+lens\s+protector|wallet\s+case|phone\s+case\s+for|hoesje\s+voor|cover\s+voor)\b/i;

const ACCESSORY_WEAK =
  /\b(case|cover|hoesje|skin|bumper|protector|charger|cable|adapter|strap|band|folie|screenprotector)\b/i;

const DISPLAY_DEMO =
  /\b(display\s+unit|floor\s+model|demo\s+unit|exhibit|shop\s+display|counter\s+model|dummy\s+(phone|unit)|non[\s-]?functional|for\s+parts(\s+only)?|defect|read\s+desc(ription)?)\b/i;

const PLACEHOLDER_DUMMY =
  /\b(lorem|test\s+listing|sample\s+title|placeholder|sku\s*[-:]?\s*tbd|no\s+image\s+yet)\b/i;

const INVENTORY_NOISE =
  /\b(assorted\s+colors?|styles?\s+may\s+vary|random\s+(color|design)|mystery\s+box|bulk\s+lot|wholesale\s+only|minimum\s+order|moq\b)\b/i;

const INCOMPLETE_TITLE = /^.{0,14}$/;

const BOX_OR_EMPTY_DEVICE =
  /\b(box\s+only|without\s+(phone|device|console)|empty\s+box|prop\s+phone|fake\s+(iphone|galaxy)\s+shell|non[\s-]?working\s+sample)\b/i;

function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x));
}

function accessoryScore(title: string, query: string): number {
  const t = title.toLowerCase();
  const q = query.toLowerCase();
  const queryWantsAccessory = /\b(case|cover|charger|cable|adapter|strap|protector|hoesje|screenprotector)\b/i.test(q);
  let s = 0;
  if (ACCESSORY_TITLE.test(t)) s += 0.82;
  else if (ACCESSORY_WEAK.test(t)) {
    s += queryWantsAccessory ? 0.08 : 0.42;
  }
  if (/\bcompatible\s+with\b/i.test(t) && !queryWantsFullDevice(q)) s += 0.22;
  return clamp01(s);
}

function queryWantsFullDevice(q: string): boolean {
  return /\b(iphone|galaxy|pixel|macbook|ipad|laptop|console|tv|watch)\b/i.test(q) && !/\b(case|cover|charger|cable)\b/i.test(q);
}

function demoPartsScore(blob: string): number {
  let s = 0;
  if (DISPLAY_DEMO.test(blob)) s += 0.78;
  return clamp01(s);
}

/** Prefer server-enriched plane when present (avoids duplicate ontology work client-side). */
export function resolveQiListingIdentity(product: QuantProduct, searchQuery: string): QiListingIdentity {
  const raw = product.qiListingIdentity;
  if (raw == null || !isQiListingIdentityTrustworthy(raw)) {
    return normalizeQiListingIdentity(assessUniversalListingIdentity(product, searchQuery));
  }
  return normalizeQiListingIdentity(raw);
}

export function assessUniversalListingIdentity(product: QuantProduct, searchQuery: string): QiListingIdentity {
  const rawTitle = product.title ?? "";
  const title = normalizeMarketplaceTitle(rawTitle);
  const extBlob = Array.isArray(product.extensions) ? product.extensions.join(" ") : "";
  const blob = `${title} ${product.availability ?? ""} ${extBlob}`;
  const ontology = inferEliteCommercialOntology(title, blob);
  const fp = buildUniversalProductFingerprint(product);
  const stem = normalizeTitlesAcrossRetailers(title).slice(0, 88);
  const variantSig = [...fp.variantTokens].sort().join("|");

  const flags: ListingIdentityFlag[] = [];
  let risk = 0;

  const accessory01 = clamp01(Math.max(accessoryScore(title, searchQuery), accessoryLikelihoodFromOntology(ontology)));
  if (accessory01 >= 0.55) {
    flags.push("accessory_lane");
    risk += accessory01 * 0.55;
  }

  if (ontology.pollutionGrammar01 >= 0.46) flags.push("semantic_pollution");

  const demo01 = demoPartsScore(blob);
  if (demo01 >= 0.5) {
    flags.push("display_or_demo");
    if (DISPLAY_DEMO.test(blob) && /\b(parts|non|defect)\b/i.test(blob)) flags.push("non_functional_or_parts");
    risk += demo01 * 0.52;
  }

  if (PLACEHOLDER_DUMMY.test(blob)) {
    flags.push("dummy_placeholder");
    risk += 0.72;
  }

  if (INVENTORY_NOISE.test(blob)) {
    flags.push("inventory_pattern_noise");
    risk += 0.38;
  }

  if (BOX_OR_EMPTY_DEVICE.test(blob)) {
    flags.push("misleading_inventory");
    risk += 0.52;
  }

  if (INCOMPLETE_TITLE.test(title.trim()) || title.trim().length < 12) {
    flags.push("title_incomplete");
    risk += 0.18;
  }

  if (/\b(seller\s+info\s+varies|ships\s+from\s+unknown|contact\s+seller\s+before)\b/i.test(blob)) {
    flags.push("seller_ambiguous");
    risk += 0.22;
  }

  const qRel = searchQuery.trim().length >= 6 ? queryListingRelevance01(searchQuery, product) : 0.72;
  const contaminant01 = clamp01(1 - qRel * 1.15);
  if (contaminant01 >= 0.42) {
    flags.push("query_contamination");
    risk += contaminant01 * 0.35;
  }

  const semanticMismatchPenalty01 = computeSemanticMismatchPenalty01(searchQuery, ontology, accessory01);
  const contaminationRisk01 = computeContaminationRisk01(ontology, contaminant01, accessory01);
  if (contaminationRisk01 >= 0.56) flags.push("commercial_identity_risk");
  risk += contaminationRisk01 * 0.18 + semanticMismatchPenalty01 * 0.14;

  if (product.oldPrice != null && product.price > 0 && product.oldPrice > product.price * 2.8) {
    flags.push("suspicious_price_story");
    risk += 0.14;
  }

  if (product.price > 0 && product.price < 3 && !/\b(bookmark|sticker|gift\s+card)\b/i.test(blob)) {
    risk += 0.12;
  }

  if (isSpammyListingTitle(title)) risk += 0.35;

  if (listingSignalsRefurbished(product) && /\b(display|demo)\b/i.test(blob)) risk += 0.08;

  const listingRisk01 = clamp01(risk);
  const uniq = new Set(flags);

  const digest = `${fp.canonicalKey.slice(0, 48)}::${stem.slice(0, 40)}::${variantSig}::${[...ontology.roles].sort().join("+")}::${ontology.completeness}`
    .replace(/\s+/g, " ")
    .trim();
  let h = 2166136261;
  for (let i = 0; i < digest.length; i++) h = Math.imul(h ^ digest.charCodeAt(i), 16777619);
  const fingerprintCompact = `ufp_${(h >>> 0).toString(16)}`;

  return normalizeQiListingIdentity({
    fingerprintCompact,
    retailerAgnosticStem: stem,
    variantSignature: variantSig,
    listingRisk01,
    accessoryLikelihood01: accessory01,
    contaminant01,
    commercialRoles: ontology.roles,
    productCompleteness: ontology.completeness,
    bundleIntegrity01: ontology.bundleIntegrity01,
    pollutionGrammar01: ontology.pollutionGrammar01,
    contaminationRisk01,
    semanticMismatchPenalty01,
    flags: [...uniq],
  });
}
