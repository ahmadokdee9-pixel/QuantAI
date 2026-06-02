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
  if (intent.technicalRequirements.some((t) => /flat_feet|lumbar|programming|high_refresh|gpu_model/i.test(t))) return true;
  if (/\b(flat\s+feet|overpronation|stability|ergonomic|lumbar|programming|ps5|144hz|rtx|galaxy|macbook|cerave|libre|perfume)\b/i.test(query)) return true;
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
      return scoreProgrammingMonitor(title, env);
    case "gaming_monitor":
      if (/\b(programming|coder|developer)\b/i.test(env)) return scoreProgrammingMonitor(title, env);
      return scoreProgrammingMonitor(title, env);
    case "electronics":
      if (/\b(programming|coder|developer|ultrasharp)\b/i.test(env)) return scoreProgrammingMonitor(title, env);
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
      if (/\b(rtx|gtx|geforce)\b/i.test(env)) {
        const text = title.toLowerCase();
        const reasons: string[] = [];
        let score = 0;
        if (/\b(rtx|gtx|geforce)\b/i.test(text)) {
          score += 24;
          reasons.push("gpu_model_match");
        }
        if (/\b(instax|camera)\b/i.test(text)) {
          score -= 30;
          reasons.push("camera_not_gpu");
        }
        return { score, reasons };
      }
      break;
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
      if (/\bquiet|tactile\b/i.test(env)) {
        const text = title.toLowerCase();
        let score = 0;
        const reasons: string[] = [];
        if (/\b(quiet|silent|tactile|brown|mx\s+brown)\b/i.test(text)) {
          score += 18;
          reasons.push("switch_preference_match");
        }
        if (EXPERT_BRANDS.mechanical_keyboard!.test(text)) {
          score += 12;
          reasons.push("expert_keyboard_brand");
        }
        return { score, reasons };
      }
      break;
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
