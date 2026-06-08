/**
 * Phase 32 — Category Reasoning Authority.
 * Category-native WHY language from existing dimensions — no new scores.
 */

import {
  type DecisionBriefAuthority,
  resolveDecisionBriefAuthority,
} from "@/lib/ui/decisionBriefAuthorityEngine";
import type { PrimaryVerdict } from "@/lib/ui/decisionLanguage";
import type { TrayVerdictAuthorityRow } from "@/lib/ui/marketOpportunityBalancingEngine";
import type { UniversalProductIntelligenceSnapshot } from "@/lib/ui/universalProductDecision";
import type {
  ProductDimensionScore,
  ProductIntelligenceSegment,
} from "@/lib/ui/universalProductIntelligenceEngine";

export type CategoryReasoningProfile = "sofa" | "iphone" | "macbook" | "laptop" | "generic";

type FocusSpec = {
  keys: string[];
  labels: string[];
  vocabulary: string[];
};

const CATEGORY_PROFILES: Record<Exclude<CategoryReasoningProfile, "generic">, FocusSpec> = {
  sofa: {
    keys: ["comfort", "construction", "material", "durability", "dimensions", "value"],
    labels: ["Comfort", "Construction", "Material", "Durability", "Dimensions", "Value"],
    vocabulary: ["comfort", "build quality", "durability", "seating depth", "daily use", "sofa"],
  },
  iphone: {
    keys: ["ecosystem", "camera", "storage", "performance", "battery", "value"],
    labels: ["Ecosystem", "Camera", "Storage", "Performance", "Battery", "Value"],
    vocabulary: ["ecosystem", "camera", "storage", "performance", "battery", "iphone"],
  },
  macbook: {
    keys: ["cpu", "portability", "longevity", "display", "ram", "value"],
    labels: ["CPU", "Portability", "Longevity", "Display", "RAM", "Value"],
    vocabulary: [
      "cpu capability",
      "portability",
      "battery life",
      "longevity",
      "display quality",
      "macbook",
    ],
  },
  laptop: {
    keys: ["value", "portability", "cpu", "ram", "longevity", "display"],
    labels: ["Value", "Portability", "CPU", "RAM", "Longevity", "Display"],
    vocabulary: ["value", "portability", "performance", "ram", "longevity", "laptop"],
  },
};

function clipLine(text: string, max = 160): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (!trimmed) return "";
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

function listingBlob(title: string, searchQuery: string): string {
  return `${title} ${searchQuery}`.toLowerCase();
}

/** Resolve category reasoning profile from existing segment + listing text. */
export function resolveCategoryReasoningProfile(
  segment: ProductIntelligenceSegment | null,
  productTitle: string,
  searchQuery = ""
): CategoryReasoningProfile {
  const blob = listingBlob(productTitle, searchQuery);
  if (segment === "sofas") return "sofa";
  if (segment === "phones") return "iphone";
  if (segment === "laptops") {
    return /macbook|apple mac/i.test(blob) ? "macbook" : "laptop";
  }
  if (/macbook|apple mac/i.test(blob)) return "macbook";
  if (/iphone|apple iphone/i.test(blob)) return "iphone";
  if (/(sofa|couch|sectional|corner sofa)/i.test(blob)) return "sofa";
  if (/(laptop|notebook|ultrabook|xps|thinkpad)/i.test(blob)) return "laptop";
  return "generic";
}

function dimensionByKey(
  dimensions: ProductDimensionScore[],
  keys: string[]
): ProductDimensionScore | null {
  for (const key of keys) {
    const match = dimensions.find((row) => row.key === key || row.label.toLowerCase() === key);
    if (match) return match;
  }
  return null;
}

function categoryTerm(profile: CategoryReasoningProfile, dimension: ProductDimensionScore): string {
  if (profile === "sofa") {
    if (dimension.key === "comfort") return "comfort";
    if (dimension.key === "construction" || dimension.key === "material") return "build quality";
    if (dimension.key === "durability") return "durability";
    if (dimension.key === "dimensions") return "seating depth";
    if (dimension.key === "value") return "daily-use value";
  }
  if (profile === "iphone") {
    if (dimension.key === "ecosystem") return "ecosystem integration";
    if (dimension.key === "camera") return "camera capability";
    if (dimension.key === "storage") return "storage tier";
    if (dimension.key === "performance") return "performance headroom";
    if (dimension.key === "battery") return "battery endurance";
    if (dimension.key === "value") return "ownership value";
  }
  if (profile === "macbook") {
    if (dimension.key === "cpu") return "cpu capability";
    if (dimension.key === "portability") return "portability";
    if (dimension.key === "longevity") return "longevity and battery life";
    if (dimension.key === "display") return "display quality";
    if (dimension.key === "ram") return "memory headroom";
    if (dimension.key === "value") return "pro-grade value";
  }
  if (profile === "laptop") {
    if (dimension.key === "value") return "price-to-spec value";
    if (dimension.key === "portability") return "portability";
    if (dimension.key === "cpu") return "performance";
    if (dimension.key === "ram") return "ram capacity";
    if (dimension.key === "longevity") return "longevity";
    if (dimension.key === "display") return "display quality";
  }
  return dimension.label.toLowerCase();
}

function rankedFocusDimensions(
  profile: Exclude<CategoryReasoningProfile, "generic">,
  dimensions: ProductDimensionScore[]
): ProductDimensionScore[] {
  const spec = CATEGORY_PROFILES[profile];
  const ranked: ProductDimensionScore[] = [];
  for (const key of spec.keys) {
    const match = dimensionByKey(dimensions, [key]);
    if (match) ranked.push(match);
  }
  return ranked.sort((a, b) => b.score - a.score);
}

function strengthPhrase(
  profile: Exclude<CategoryReasoningProfile, "generic">,
  dimensions: ProductDimensionScore[],
  count = 2
): string {
  const ranked = rankedFocusDimensions(profile, dimensions);
  const lead = ranked.slice(0, count);
  if (lead.length >= 2) {
    return `${categoryTerm(profile, lead[0]!)} and ${categoryTerm(profile, lead[1]!)}`;
  }
  if (lead[0]) return categoryTerm(profile, lead[0]);
  return CATEGORY_PROFILES[profile].vocabulary.slice(0, 2).join(" and ");
}

function weaknessPhrase(
  profile: Exclude<CategoryReasoningProfile, "generic">,
  dimensions: ProductDimensionScore[]
): string {
  const ranked = rankedFocusDimensions(profile, dimensions);
  const weak = ranked[ranked.length - 1] ?? ranked[0];
  if (weak) return categoryTerm(profile, weak);
  return CATEGORY_PROFILES[profile].vocabulary[CATEGORY_PROFILES[profile].vocabulary.length - 1] ?? "fit";
}

function competitorPhrase(profile: CategoryReasoningProfile): string {
  if (profile === "sofa") return "competing sofas";
  if (profile === "iphone") return "nearby iPhone listings";
  if (profile === "macbook") return "rival MacBook configurations";
  if (profile === "laptop") return "nearby laptop deals";
  return "nearby alternatives";
}

function categoryFocusSummary(profile: Exclude<CategoryReasoningProfile, "generic">): string {
  if (profile === "sofa") {
    return "comfort, build quality, durability, seating depth, and daily use";
  }
  if (profile === "iphone") {
    return "ecosystem, camera, storage, performance, and battery";
  }
  if (profile === "macbook") {
    return "cpu capability, portability, battery life, longevity, and display quality";
  }
  return "value, portability, performance, ram, and longevity";
}

function categoryNoun(profile: CategoryReasoningProfile): string {
  if (profile === "sofa") return "sofa";
  if (profile === "iphone") return "iPhone";
  if (profile === "macbook") return "MacBook";
  if (profile === "laptop") return "laptop";
  return "product";
}

function valuePlain(
  intelligence: UniversalProductIntelligenceSnapshot,
  dimensions: ProductDimensionScore[],
  profile: CategoryReasoningProfile
): string {
  const valueDim = dimensions.find((row) => row.key === "value");
  const score = valueDim?.score ?? intelligence.valueScore;
  if (profile === "sofa") {
    if (score >= 62) return "strong daily-use value for this sofa tray";
    if (score >= 50) return "acceptable sofa pricing, but not tray-leading";
    return "sofa pricing that trails better-finished alternatives";
  }
  if (profile === "iphone") {
    if (score >= 62) return "strong iPhone ownership value in this tray";
    if (score >= 50) return "acceptable iPhone pricing, but not decisive";
    return "iPhone pricing that lags better storage tiers nearby";
  }
  if (profile === "macbook") {
    if (score >= 62) return "strong MacBook value for this configuration";
    if (score >= 50) return "acceptable MacBook pricing, but not leading";
    return "MacBook pricing that undercuts build quality elsewhere";
  }
  if (profile === "laptop") {
    if (score >= 62) return "leading laptop value in this tray";
    if (score >= 50) return "acceptable laptop pricing, but not decisive";
    return "laptop value that trails better ram and performance nearby";
  }
  if (score >= 62) return "leading tray value";
  if (score >= 50) return "acceptable tray value";
  return "weak tray value";
}

function pressurePlain(pressure: number, profile: CategoryReasoningProfile): string {
  const noun = competitorPhrase(profile);
  if (pressure >= 65) return `heavy ${noun} pressure in this tray`;
  if (pressure >= 52) return `meaningful ${noun} pressure`;
  if (pressure >= 40) return `moderate ${noun} overlap`;
  return `limited ${noun} pressure`;
}

function buildCategoryThesis(
  verdict: PrimaryVerdict,
  profile: CategoryReasoningProfile,
  strengths: string,
  weakness: string,
  valueText: string,
  pressureText: string,
  authority?: TrayVerdictAuthorityRow
): string {
  const noun = categoryNoun(profile);

  if (profile === "generic") {
    if (verdict === "BUY READY") {
      return authority?.rankIndex === 0
        ? "This product currently delivers the strongest overall value-quality balance in the tray."
        : clipLine(`This product leads the tray on ${strengths} with ${valueText}.`);
    }
    if (verdict === "COMPARE") {
      return "This product performs well, but competing listings deliver similar capability with better value.";
    }
    if (verdict === "WAIT") {
      return "The current price and feature profile do not justify purchase compared with nearby alternatives.";
    }
    return clipLine(`Significant weakness in ${weakness} outweighs ${valueText}.`);
  }

  if (verdict === "BUY READY") {
    if (profile === "sofa") {
      return clipLine(
        `This ${noun} combines ${strengths} with ${valueText} — the strongest living-room purchase opportunity in the tray.`
      );
    }
    if (profile === "iphone") {
      return clipLine(
        `This ${noun} leads on ${strengths}, making it the clearest phone purchase in the tray right now.`
      );
    }
    if (profile === "macbook") {
      return clipLine(
        `This ${noun} leads on ${strengths}, making it the strongest portable workstation buy in the tray.`
      );
    }
    return clipLine(
      `This ${noun} leads on ${strengths} with ${valueText} — the best general-purpose notebook buy here.`
    );
  }

  if (verdict === "COMPARE") {
    if (profile === "sofa") {
      return clipLine(
        `This ${noun} is comfortable, but ${competitorPhrase(profile)} deliver similar layouts with better ${weakness} and value.`
      );
    }
    if (profile === "iphone") {
      return clipLine(
        `This ${noun} is capable, but ${competitorPhrase(profile)} match ${strengths} with sharper ownership value.`
      );
    }
    if (profile === "macbook") {
      return clipLine(
        `This ${noun} is strong, but ${competitorPhrase(profile)} match ${strengths} with better portable value.`
      );
    }
    return clipLine(
      `This ${noun} performs well, but ${competitorPhrase(profile)} beat it on ${weakness} and overall value.`
    );
  }

  if (verdict === "WAIT") {
    if (profile === "sofa") {
      return clipLine(
        `This ${noun}'s ${weakness} and ${valueText} do not yet justify purchase against ${competitorPhrase(profile)}.`
      );
    }
    if (profile === "iphone") {
      return clipLine(
        `This ${noun}'s ${weakness} and ${valueText} do not yet justify upgrade against ${competitorPhrase(profile)}.`
      );
    }
    if (profile === "macbook") {
      return clipLine(
        `This ${noun}'s ${weakness} and ${valueText} do not yet justify checkout against ${competitorPhrase(profile)}.`
      );
    }
    return clipLine(
      `This ${noun}'s ${weakness} and ${valueText} do not yet justify purchase against ${competitorPhrase(profile)}.`
    );
  }

  return clipLine(
    `${categoryNoun(profile)} weakness in ${weakness} and seller trust outweigh ${valueText} despite ${pressureText}.`
  );
}

/** Category-native decision brief language (Phase 32). */
export function resolveCategoryDecisionBriefAuthority(
  verdict: PrimaryVerdict,
  dimensions: ProductDimensionScore[],
  store: string,
  intelligence: UniversalProductIntelligenceSnapshot,
  profile: CategoryReasoningProfile,
  authority?: TrayVerdictAuthorityRow,
  productTitle = "",
  searchQuery = ""
): DecisionBriefAuthority {
  if (profile === "generic") {
    const blob = listingBlob(productTitle, searchQuery);
    if (/iphone/i.test(blob)) profile = "iphone";
    else if (/macbook/i.test(blob)) profile = "macbook";
    else if (/(sofa|couch|sectional)/i.test(blob)) profile = "sofa";
    else if (/(laptop|notebook|xps)/i.test(blob)) profile = "laptop";
  }

  if (profile === "generic") {
    return resolveDecisionBriefAuthority(verdict, dimensions, store, intelligence, authority);
  }

  const strengths = strengthPhrase(profile, dimensions, 2);
  const weakness = weaknessPhrase(profile, dimensions);
  const valueText = valuePlain(intelligence, dimensions, profile);
  const pressureText = pressurePlain(intelligence.alternativePressure, profile);
  const noun = categoryNoun(profile);
  const rivals = competitorPhrase(profile);
  const focusSummary = categoryFocusSummary(profile);

  const decisionThesis = buildCategoryThesis(
    verdict,
    profile,
    strengths,
    weakness,
    valueText,
    pressureText,
    authority
  );

  let primaryReason = "";
  let purchaseReasoning = "";

  if (verdict === "BUY READY") {
    primaryReason = clipLine(
      `${store}: this ${noun} is the best purchase opportunity now because ${strengths} create clear strength across ${focusSummary}, with ${valueText} and ${pressureText}.`
    );
    purchaseReasoning = clipLine(
      `Purchase this ${noun} — category focus ${focusSummary}; leading strengths ${strengths}; watch ${weakness}; ${valueText}; ${pressureText}.`,
      168
    );
  } else if (verdict === "COMPARE") {
    primaryReason = clipLine(
      `${store}: ${rivals} block BUY READY by beating this ${noun} on ${weakness} and ${valueText} despite similar ${strengths} across ${focusSummary}.`
    );
    purchaseReasoning = clipLine(
      `Compare ${noun} options — category focus ${focusSummary}; strengths ${strengths}; rival edge on ${weakness}; ${valueText}; ${pressureText}.`,
      168
    );
  } else if (verdict === "WAIT") {
    primaryReason = clipLine(
      `${store}: wait on this ${noun} until ${weakness} improves across ${focusSummary} — ${valueText} and ${pressureText} keep it from being an attractive buy.`
    );
    purchaseReasoning = clipLine(
      `Wait on this ${noun} — category focus ${focusSummary}; gap ${weakness}; partial strengths ${strengths}; ${valueText}; ${pressureText}.`,
      168
    );
  } else {
    primaryReason = clipLine(
      `${store}: avoid this ${noun} — ${weakness} and seller trust fail ${focusSummary} expectations despite ${strengths}.`
    );
    purchaseReasoning = clipLine(
      `Avoid this ${noun} — category focus ${focusSummary}; weakness ${weakness}; partial strengths ${strengths}; ${valueText}; ${pressureText}.`,
      168
    );
  }

  return {
    decisionThesis,
    primaryReason,
    secondaryReason: clipLine(`Why this verdict: ${purchaseReasoning}`),
    purchaseReasoning,
  };
}

/** Validation helper — explanation should read as category-native. */
export function explanationMatchesCategoryProfile(
  profile: CategoryReasoningProfile,
  text: string
): boolean {
  const blob = text.toLowerCase();
  if (profile === "generic") return true;
  const markers = CATEGORY_PROFILES[profile].vocabulary;
  const hits = markers.filter((term) => blob.includes(term)).length;
  return hits >= 2 || markers.slice(0, 2).every((term) => blob.includes(term));
}

export function getCategoryProfileVocabulary(
  profile: CategoryReasoningProfile
): string[] {
  if (profile === "generic") return [];
  return CATEGORY_PROFILES[profile].vocabulary;
}
