/**
 * Phase 8 — Specialty intent ranking: expert listings above generic category matches.
 * Used by searchIntelligenceUpgrade, comparison labels, and decision brief.
 */

import type { ExtractedSearchIntent } from "@/lib/search/intentExtractionEngine";
import { getStoreTrustScore } from "@/lib/shoppingScore";
import { getMarketplaceSellerRiskTier } from "@/lib/retailTrust";

export type SpecialtyRankingSignals = {
  specialtyScore: number;
  expertBoost: number;
  weakListingPenalty: number;
  marketplacePenalty: number;
  trustAdjustment: number;
  totalAdjustment: number;
  reasons: string[];
};

const SPECIALTY_PRODUCT_TYPES = new Set([
  "running_shoes",
  "gaming_headset",
  "office_chair",
  "gaming_monitor",
  "programming_monitor",
  "standing_desk",
  "mechanical_keyboard",
  "monitor_mount",
  "graphics_card",
  "television",
  "robot_vacuum",
  "lipstick",
  "retinol_serum",
  "mattress",
  "yoga_mat",
  "phone",
  "laptop",
  "fragrance",
  "air_fryer",
  "lipstick",
  "moisturizer",
  "sofa",
  "dumbbells",
  "controller_accessory",
  "fashion",
  "coffee_maker",
  "cookware",
  "webcam",
  "stand_mixer",
]);

const EXPERT_BRANDS: Record<string, RegExp> = {
  running_shoes: /\b(asics|brooks|hoka|saucony|new\s+balance|mizuno|on\s+running|altra)\b/i,
  gaming_headset: /\b(steelseries|hyperx|logitech|astro|sony|playstation|pulse\s*3d|arctis|razer|turtle\s+beach|epos)\b/i,
  office_chair: /\b(herman\s+miller|steelcase|secretlab|humanscale|haworth|noblechairs|ergonomic)\b/i,
  gaming_monitor: /\b(dell|lg|benq|asus|acer|gigabyte|samsung|viewsonic|alienware)\b/i,
  programming_monitor: /\b(dell\s+ultrasharp|ultrasharp|benq\s+sw|eizo|lg\s+27|ips|usb[-\s]?c|displayport)\b/i,
  graphics_card: /\b(nvidia|geforce|rtx|gtx|zotac|msi|asus|gigabyte|sapphire|evga)\b/i,
  mechanical_keyboard: /\b(keychron|logitech|razer|corsair|ducky|leopold|filco|steelseries)\b/i,
};

function envelopeOf(query: string, intent: ExtractedSearchIntent): string {
  return `${query} ${intent.productType} ${intent.performanceIntent ?? ""} ${intent.technicalRequirements.join(" ")}`.toLowerCase();
}

/** True when query expects an expert/specialty match, not generic category fill. */
export function isSpecialtyPurchaseIntent(intent: ExtractedSearchIntent, query: string): boolean {
  if (intent.performanceIntent) return true;
  if (intent.brand) return true;
  if (SPECIALTY_PRODUCT_TYPES.has(intent.productType)) return true;
  if (intent.productType !== "unknown" && intent.productType !== "headphones") return true;
  if (intent.technicalRequirements.some((t) => /flat_feet|lumbar|programming|high_refresh|gpu_model|tactile_switch|ai_training/i.test(t))) return true;
  if (/\b(flat\s+feet|overpronation|stability|ergonomic|lumbar|programming|ps5|144hz|rtx|galaxy|macbook|cerave|libre|perfume|ai\s+training|deep\s+learning|cuda|tactile|quiet\s+tactile)\b/i.test(query)) return true;
  return false;
}

function weakGenericListingPenalty(title: string, store: string): { penalty: number; reasons: string[] } {
  const text = `${title} ${store}`.toLowerCase();
  const reasons: string[] = [];
  let penalty = 0;

  if (/^(running\s+shoes|men\s+professional\s+running|gaming\s+headset|wireless\s+headset)\b/i.test(title.trim())) {
    penalty += 16;
    reasons.push("generic_drop_ship_title");
  }
  if (/\b(trendy\s+original|shock\s+absorption\s+m\d|professional\s+running\s+shoes\s+breathable|rgb\s+light|koptelefoon\s+draadloos)\b/i.test(text)) {
    penalty += 14;
    reasons.push("low_signal_marketplace_title");
  }
  if (/\b(ntech|r\s*y\s*c\s+toys|baasploa|trendy\s+original)\b/i.test(text)) {
    penalty += 12;
    reasons.push("unbranded_marketplace_seller");
  }
  if (title.trim().length < 22 && !/\b(apple|samsung|sony|nike|adidas|dell|lg|asus)\b/i.test(text)) {
    penalty += 8;
    reasons.push("short_unbranded_title");
  }
  if ((title.match(/\b\w+\b/g) ?? []).length <= 4 && !/\b(rtx|gtx|kayano|arctis|ultrasharp)\b/i.test(text)) {
    penalty += 6;
    reasons.push("thin_title_tokens");
  }

  return { penalty, reasons };
}

function marketplaceTrustPenalty(store: string, title: string): { penalty: number; adjustment: number; reasons: string[] } {
  const trust = getStoreTrustScore(store);
  const mp = getMarketplaceSellerRiskTier(store, title);
  const reasons: string[] = [];
  let adjustment = 0;
  let penalty = 0;

  if (trust >= 88) adjustment += 8;
  else if (trust >= 82) adjustment += 5;
  else if (trust >= 75) adjustment += 3;
  else if (trust >= 68) adjustment += 1;
  else if (trust < 55) {
    adjustment -= 14;
    penalty += 10;
    reasons.push("low_trust_store");
  } else if (trust < 62) {
    adjustment -= 8;
    penalty += 6;
    reasons.push("below_average_trust");
  }

  if (mp === "high") {
    adjustment -= 16;
    penalty += 14;
    reasons.push("high_risk_marketplace");
  } else if (mp === "medium") {
    adjustment -= 7;
    penalty += 5;
    if (/ebay/i.test(store)) reasons.push("ebay_marketplace_variance");
  }

  if (/\bebay\s*[-–]/i.test(store) || /\bmarketplace\s+seller\b/i.test(store)) {
    adjustment -= 5;
    penalty += 4;
    reasons.push("third_party_marketplace_listing");
  }

  if (/\b(wish\.|temu|aliexpress|dhgate)\b/i.test(store)) {
    adjustment -= 12;
    penalty += 12;
    reasons.push("discount_marketplace_platform");
  }

  return { penalty, adjustment, reasons };
}

function scoreRunningShoes(title: string, env: string): { score: number; reasons: string[] } {
  const text = title.toLowerCase();
  const reasons: string[] = [];
  let score = 0;

  if (/\b(stability|support|overpronation|motion\s+control|structured|flat\s+feet)\b/i.test(text)) {
    score += 28;
    reasons.push("stability_support_match");
  }
  if (/\b(kayano|arahi|beast|adrenaline|guide|gel|ghost|pegasus|860|990|1080)\b/i.test(text)) {
    score += 22;
    reasons.push("expert_running_model");
  }
  if (EXPERT_BRANDS.running_shoes!.test(text)) {
    score += 14;
    reasons.push("expert_running_brand");
  }
  if (/\b(men'?s?|heren|male)\b/i.test(text) && /\bmen\b/i.test(env)) {
    score += 4;
    reasons.push("gender_match");
  }
  if (/\b(air\s+force|handball|spezial|3mc|dunk|samba|walking\s+shoe|lifestyle)\b/i.test(text) && !/\b(running|stability|support)\b/i.test(text)) {
    score -= 24;
    reasons.push("lifestyle_not_running");
  }
  if (/\b(women'?s?|dames|female)\b/i.test(text) && /\bmen\b/i.test(env)) {
    score -= 20;
    reasons.push("gender_mismatch");
  }

  return { score, reasons };
}

function scoreGamingHeadset(title: string, env: string): { score: number; reasons: string[] } {
  const text = title.toLowerCase();
  const reasons: string[] = [];
  let score = 0;

  if (EXPERT_BRANDS.gaming_headset!.test(text)) {
    score += 26;
    reasons.push("tier1_gaming_audio_brand");
  }
  if (/\b(ps5|playstation|pulse\s*3d|arctis|official|licensed)\b/i.test(text)) {
    score += 18;
    reasons.push("ps5_platform_match");
  }
  if (/\b(wireless|bluetooth|2\.4g)\b/i.test(text) && /\bwireless\b/i.test(env)) {
    score += 8;
    reasons.push("wireless_requirement");
  }
  if (/\b(gaming\s+headset|headset)\b/i.test(text)) {
    score += 6;
  }
  if (/\b(rgb\s+light|led\s+light|generic|universal)\b/i.test(text) && !EXPERT_BRANDS.gaming_headset!.test(text)) {
    score -= 16;
    reasons.push("generic_rgb_headset");
  }

  return { score, reasons };
}

function scoreOfficeChair(title: string, env: string): { score: number; reasons: string[] } {
  const text = title.toLowerCase();
  const reasons: string[] = [];
  let score = 0;

  if (/\b(lumbar|ergonomic|adjustable\s+lumbar|posture)\b/i.test(text)) {
    score += 24;
    reasons.push("ergonomic_lumbar_match");
  }
  if (EXPERT_BRANDS.office_chair!.test(text)) {
    score += 20;
    reasons.push("expert_office_chair_brand");
  }
  if (/\b(office\s+chair|desk\s+chair|task\s+chair)\b/i.test(text)) {
    score += 8;
  }
  if (/\b(gaming\s+chair)\b/i.test(text) && !/\b(ergonomic|lumbar)\b/i.test(text) && /\bergonomic\b/i.test(env)) {
    score -= 12;
    reasons.push("gaming_chair_without_ergonomics");
  }

  return { score, reasons };
}

function scoreProgrammingMonitor(title: string, env: string): { score: number; reasons: string[] } {
  const text = title.toLowerCase();
  const reasons: string[] = [];
  let score = 0;

  if (/\b(programming|coder|developer|productivity|ultrasharp|ips|usb[-\s]?c)\b/i.test(env)) {
    if (/\b(ips|ultrasharp|usb[-\s]?c|displayport|height\s+adjust|pivot|srgb|factory\s+calibrat)\b/i.test(text)) {
      score += 24;
      reasons.push("programming_monitor_traits");
    }
    if (EXPERT_BRANDS.programming_monitor!.test(text) || EXPERT_BRANDS.gaming_monitor!.test(text)) {
      score += 14;
      reasons.push("pro_monitor_brand");
    }
    if (/\b(tv|television|smart\s+tv)\b/i.test(text) && !/\b(monitor|display)\b/i.test(text)) {
      score -= 22;
      reasons.push("tv_not_monitor");
    }
    if (/\b(curved\s+gaming)\b/i.test(text) && !/\b(ips|usb|displayport|ultrasharp)\b/i.test(text)) {
      score -= 8;
      reasons.push("gaming_only_without_productivity");
    }
  }

  if (/\b(monitor|display|beeldscherm)\b/i.test(text)) score += 6;
  if (/\b(\d{2,3})\s*hz\b/i.test(text) && /\b144hz|165hz|240hz\b/i.test(env)) score += 10;

  return { score, reasons };
}

/** GPU scoring — distinguishes AI-training class from gaming-only, legacy datacenter, or accessory. */
function scoreGpu(title: string, intent: ExtractedSearchIntent, env: string): { score: number; reasons: string[] } {
  const text = title.toLowerCase();
  const reasons: string[] = [];
  let score = 0;
  const isAiTrainingQuery =
    intent.performanceIntent === "ai_training" ||
    intent.subtype === "ai_training" ||
    /\b(ai\s+training|machine\s+learning|deep\s+learning|cuda|vram|tensor|llm|ml)\b/i.test(env);

  // Camera / wrong product
  if (/\b(instax|camera|fujifilm|dslr|mirrorless)\b/i.test(text)) {
    score -= 40;
    reasons.push("camera_not_gpu");
    return { score, reasons };
  }

  // Modern RTX / Quadro Ada / Blackwell — high-VRAM, ideal for AI
  if (/\b(rtx\s*(?:4090|4080|4070\s*ti|4070|4060|3090|3080|3070)|quadro\s+rtx|rtx\s+pro|blackwell|rtx\s+\d{4})\b/i.test(text)) {
    score += 30;
    reasons.push("modern_rtx_gpu");
    if (isAiTrainingQuery) {
      if (/\b(4090|3090|rtx\s+pro|blackwell|a\d{4}|h\d{3}|rtx\s+4500|rtx\s+4000)\b/i.test(text)) {
        score += 18;
        reasons.push("high_vram_ai_suitable");
      }
    }
  }

  // Pro / workstation Quadro / Tesla / Ada — excellent for AI
  if (/\b(quadro|tesla|a100|h100|a\d{3,4}|l40|l4\b|rtx\s+\d{4}\s+ada|professional\s+gpu|workstation\s+gpu)\b/i.test(text)) {
    score += 20;
    reasons.push("pro_workstation_gpu");
    if (isAiTrainingQuery) {
      score += 14;
      reasons.push("professional_ai_hardware");
    }
  }

  // Legacy / obsolete for AI training: GRID K1/K2, Kepler/Maxwell generation
  if (/\b(grid\s+k[1-4]|quadro\s+k\d{3,4}|gtx\s*[5-9]\d{2}\b|gtx\s*[1-4]\d{2}\b|grid\s+m\d+|p40\b|m40\b|m60\b)\b/i.test(text)) {
    score -= 22;
    reasons.push("legacy_datacenter_gpu");
    if (isAiTrainingQuery) {
      score -= 18;
      reasons.push("obsolete_for_ai_training");
    }
  }

  // VRAM callout — good signal for AI
  if (/\b(24\s*gb|20\s*gb|16\s*gb|48\s*gb)\b/i.test(text) && isAiTrainingQuery) {
    score += 10;
    reasons.push("high_vram_callout");
  }

  // Generic GPU brand match (always good, neutral)
  if (/\b(rtx|gtx|geforce|nvidia)\b/i.test(text) && score === 0) {
    score += 14;
    reasons.push("gpu_model_match");
  }

  return { score, reasons };
}

/** Mechanical keyboard scoring — resolves tactile vs linear conflict. */
function scoreMechanicalKeyboard(title: string, intent: ExtractedSearchIntent, env: string): { score: number; reasons: string[] } {
  const text = title.toLowerCase();
  const reasons: string[] = [];
  let score = 0;

  const wantsTactile =
    intent.technicalRequirements.includes("tactile_switch") ||
    /\btactile\b/i.test(env);
  const wantsQuiet = /\b(quiet|silent)\b/i.test(env);
  const wantsLinear = intent.technicalRequirements.includes("linear_switch") && !wantsTactile;

  // Tactile switch types: brown, clicky-tactile, Box Brown, Silent Brown, MX Brown, Topre, etc.
  const hasTactileSwitch =
    /\b(tactile|brown\s+switch|mx\s+brown|silent\s+brown|topre|silent\s+tactile|quiet\s+tactile|box\s+brown|gateron\s+brown|kailh\s+brown|holy\s+panda)\b/i.test(text);
  // Linear switch types: red, speed, silver, linear switch
  const hasLinearSwitch =
    /\b(linear\s+red|red\s+switch|speed\s+silver|mx\s+red|gateron\s+red|kailh\s+red|linear\s+switch|cherry\s+mx\s+red)\b/i.test(text) &&
    !/\btactile\b/i.test(text);

  if (wantsTactile && hasTactileSwitch) {
    score += 28;
    reasons.push("tactile_switch_match");
  } else if (wantsTactile && hasLinearSwitch) {
    score -= 22;
    reasons.push("linear_not_tactile_mismatch");
  } else if (hasTactileSwitch && wantsQuiet) {
    score += 20;
    reasons.push("quiet_tactile_match");
  } else if (!wantsTactile && !wantsLinear) {
    // Generic mechanical: any switch is acceptable
    if (/\b(quiet|silent)\b/i.test(text)) {
      score += 16;
      reasons.push("quiet_keyboard_match");
    } else if (/\b(tactile|brown)\b/i.test(text)) {
      score += 14;
      reasons.push("switch_preference_match");
    }
  }

  // Linear is fine when quiet is wanted but tactile not explicitly required
  if (wantsQuiet && !wantsTactile && hasLinearSwitch) {
    score += 12;
    reasons.push("quiet_linear_acceptable");
  }

  if (EXPERT_BRANDS.mechanical_keyboard!.test(text)) {
    score += 12;
    reasons.push("expert_keyboard_brand");
  }

  return { score, reasons };
}

/** Programming monitor — stronger differentiation: productivity traits vs gaming-only/budget. */
function scoreProgrammingMonitorV2(title: string, env: string): { score: number; reasons: string[] } {
  const text = title.toLowerCase();
  const reasons: string[] = [];
  let score = 0;

  // Hard penalty: TV or smart-TV in title but no monitor keyword
  if (/\b(smart\s+tv|television|\btv\b)\b/i.test(text) && !/\b(monitor|display|beeldscherm)\b/i.test(text)) {
    score -= 28;
    reasons.push("tv_not_monitor");
    return { score, reasons };
  }

  // Strong productivity signals
  if (/\b(ultrasharp|proart|ultrafine|flexscan|sw\d{3}|ev\d{4})\b/i.test(text)) {
    score += 30;
    reasons.push("pro_monitor_model_line");
  }
  if (/\busb[-\s]?c\b/i.test(text)) {
    score += 20;
    reasons.push("usb_c_connectivity");
  }
  if (/\b(ips|oled|nano\s+ips|ips\s+black)\b/i.test(text)) {
    score += 12;
    reasons.push("ips_panel_type");
  }
  if (/\b(4k|qhd|2k|3840|2560|uhd)\b/i.test(text)) {
    score += 10;
    reasons.push("high_resolution");
  }
  if (/\b(height\s+adjust|tilt|pivot|swivel|ergonomic\s+stand|vesa)\b/i.test(text)) {
    score += 8;
    reasons.push("ergonomic_stand");
  }
  if (/\b(srgb|dci[-\s]?p3|factory\s+calibrat|color\s+accurate)\b/i.test(text)) {
    score += 8;
    reasons.push("colour_accuracy");
  }
  if (/\b(displayport|dp\s+\d|thunderbolt)\b/i.test(text)) {
    score += 6;
    reasons.push("dp_thunderbolt");
  }

  // Pro brands
  if (/\b(dell\s+ultrasharp|dell\s+u\d|lg\s+27|lg\s+32|benq\s+sw|benq\s+pd|asus\s+proart|eizo|apple\s+studio\s+display|viewsonic\s+vp)\b/i.test(text)) {
    score += 14;
    reasons.push("pro_monitor_brand");
  } else if (EXPERT_BRANDS.gaming_monitor!.test(text)) {
    score += 6;
    reasons.push("monitor_brand");
  }

  // Penalise pure budget / gaming-only listings when programming is the intent
  if (/\b(ktc|misura|koorui|viotek|sceptre|cheap|budget)\b/i.test(text) && !/\b(ips|qhd|usb[-\s]?c)\b/i.test(text)) {
    score -= 12;
    reasons.push("budget_generic_monitor");
  }
  if (/\b(gaming\s+monitor|165hz|240hz|360hz|freesync|g[-\s]?sync)\b/i.test(text) && !/\b(ips|usb[-\s]?c|ultrasharp|proart)\b/i.test(text)) {
    score -= 8;
    reasons.push("gaming_only_no_productivity");
  }

  // Base points for being a monitor at all
  if (/\b(monitor|display|beeldscherm)\b/i.test(text)) score += 6;

  return { score, reasons };
}

function scoreByProductType(
  title: string,
  intent: ExtractedSearchIntent,
  env: string
): { score: number; reasons: string[] } {
  switch (intent.productType) {
    case "running_shoes":
      return scoreRunningShoes(title, env);
    case "gaming_headset":
      return scoreGamingHeadset(title, env);
    case "office_chair":
      return scoreOfficeChair(title, env);
    case "programming_monitor":
      return scoreProgrammingMonitorV2(title, env);
    case "gaming_monitor":
      if (/\b(programming|coder|developer)\b/i.test(env)) return scoreProgrammingMonitorV2(title, env);
      return scoreProgrammingMonitor(title, env);
    case "electronics":
      if (/\b(programming|coder|developer|ultrasharp)\b/i.test(env)) return scoreProgrammingMonitorV2(title, env);
      break;
    case "phone":
    case "laptop": {
      const text = title.toLowerCase();
      const reasons: string[] = [];
      let score = 0;
      if (/\b(case|cover|hoesje|screen\s+protector|strap|band\s+only|charger\s+only)\b/i.test(text)) {
        score -= 28;
        reasons.push("accessory_not_device");
      }
      if (/\b(iphone|galaxy|pixel|macbook|thinkpad|ultrabook|laptop|phone|smartphone)\b/i.test(text)) {
        score += 18;
        reasons.push("core_device_match");
      }
      if (intent.brand && new RegExp(intent.brand, "i").test(text)) {
        score += 12;
        reasons.push("brand_match");
      }
      return { score, reasons };
    }
    case "fragrance": {
      const text = title.toLowerCase();
      let score = 0;
      const reasons: string[] = [];
      if (/\b(eau de parfum|edp|parfum|cologne)\b/i.test(text)) {
        score += 16;
        reasons.push("perfume_format");
      }
      if (/\b(replica|inspired|dupe|oil)\b/i.test(text)) {
        score -= 24;
        reasons.push("replica_fragrance");
      }
      if (/\b(ysl|yves|chanel|dior|libre)\b/i.test(text)) {
        score += 12;
        reasons.push("designer_house");
      }
      return { score, reasons };
    }
    case "graphics_card":
      return scoreGpu(title, intent, env);
    case "desk_accessory": {
      const text = title.toLowerCase();
      let score = 0;
      const reasons: string[] = [];
      if (/\b(cable\s+management|organizer|grommet|cord|tray)\b/i.test(text)) {
        score += 18;
        reasons.push("desk_organizer_match");
      }
      if (/\b(sofa|couch|table|chair)\b/i.test(text) && !/\b(organizer|cable|desk)\b/i.test(text)) {
        score -= 22;
        reasons.push("furniture_not_organizer");
      }
      return { score, reasons };
    }
    case "mechanical_keyboard":
      return scoreMechanicalKeyboard(title, intent, env);
    default:
      break;
  }

  const brandRx = EXPERT_BRANDS[intent.productType];
  if (brandRx?.test(title)) {
    return { score: 12, reasons: ["expert_brand_in_category"] };
  }
  return { score: 0, reasons: [] };
}

/** Score how well a listing satisfies specialty intent (higher = better #1 candidate). */
export function scoreSpecialtyListing(
  title: string,
  store: string,
  intent: ExtractedSearchIntent,
  query: string
): SpecialtyRankingSignals {
  const env = envelopeOf(query, intent);
  const specialty = scoreByProductType(title, intent, env);
  const weak = weakGenericListingPenalty(title, store);
  const market = marketplaceTrustPenalty(store, title);

  const expertBoost = Math.min(20, Math.max(0, specialty.score));
  const weakListingPenalty = weak.penalty;
  const marketplacePenalty = market.penalty;
  const trustAdjustment = market.adjustment;

  const totalAdjustment =
    expertBoost - weakListingPenalty - marketplacePenalty + trustAdjustment;

  return {
    specialtyScore: specialty.score,
    expertBoost,
    weakListingPenalty,
    marketplacePenalty,
    trustAdjustment,
    totalAdjustment,
    reasons: [...specialty.reasons, ...weak.reasons, ...market.reasons].slice(0, 8),
  };
}

/** Pick index of best specialty-aligned product in tray (post-sort helper for brief). */
export function pickSpecialtyLeaderIndex(
  products: Array<{ title: string; store: string }>,
  intent: ExtractedSearchIntent,
  query: string
): number {
  if (!products.length) return 0;
  let bestIdx = 0;
  let bestScore = -Infinity;
  for (let i = 0; i < Math.min(products.length, 12); i++) {
    const p = products[i]!;
    const { totalAdjustment, specialtyScore } = scoreSpecialtyListing(p.title, p.store, intent, query);
    const combined = totalAdjustment + specialtyScore * 0.35;
    if (combined > bestScore) {
      bestScore = combined;
      bestIdx = i;
    }
  }
  return bestIdx;
}
