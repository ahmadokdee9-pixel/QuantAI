import type { ProductCategorySlug } from "@/lib/intelligence/types";
import { inferProductCategory } from "@/lib/intelligence/categoryContext";

export type CommerceSubcategory =
  | "laptop"
  | "phone"
  | "monitor"
  | "headphones"
  | "furniture"
  | "generic_electronics"
  | "other";

function detectSubcategory(query: string, title: string, slug: ProductCategorySlug): CommerceSubcategory {
  const t = `${query} ${title}`.toLowerCase();
  if (slug !== "electronics" && slug !== "home" && slug !== "general") return "other";
  if (/laptop|macbook|chromebook|ultrabook|thinkpad|surface laptop/i.test(t)) return "laptop";
  if (/iphone|pixel|galaxy s|galaxy a|oneplus|android phone|smartphone|mobile phone/i.test(t)) return "phone";
  if (/monitor|display|oled monitor|ips panel|hz\b|refresh|ultrawide|4k monitor/i.test(t)) return "monitor";
  if (/headphone|earbud|airpods|anc\b|noise cancelling|codec|aptx/i.test(t)) return "headphones";
  if (/sofa|chair|desk|table|furniture|mattress|shelf|assembly/i.test(t)) return "furniture";
  if (slug === "electronics") return "generic_electronics";
  return "other";
}

/** Spec-style checklist bullets (title/query keyword heuristics only—no invented specs). */
export function buildCategoryLensBullets(
  query: string,
  title: string,
  slug: ProductCategorySlug
): { subcategory: CommerceSubcategory; bullets: string[] } {
  const sub = detectSubcategory(query, title, slug);
  const bullets: string[] = [];

  switch (sub) {
    case "laptop":
      bullets.push(
        "Cross-check RAM, CPU generation, and battery spec on the retailer page—tray titles rarely carry full configs."
      );
      bullets.push("Thermals and upgradeability (RAM/storage soldered vs slots) matter for longevity.");
      break;
    case "phone":
      bullets.push("Battery health / cycle policy is not in shopping feeds—confirm for refurbished or marketplace rows.");
      bullets.push("Camera and storage tiers swing value; verify SKU matches the variant you want.");
      bullets.push("Software longevity (OS update window) is a long-term cost—look up OEM policy.");
      break;
    case "monitor":
      bullets.push("Refresh rate, panel type (IPS/TN/VA/OLED), and color coverage drive fit for gaming vs color work.");
      bullets.push("Office vs gaming scoring diverges—decide which axis you optimize first.");
      break;
    case "headphones":
      bullets.push("ANC quality and codec support (LDAC/aptX/AAC) change perceived value more than price alone.");
      bullets.push("Battery life and comfort are experiential—read long-form reviews when possible.");
      break;
    case "furniture":
      bullets.push("Materials and shipping damage risk dominate satisfaction—check carton condition and return freight.");
      bullets.push("Assembly burden and missing-hardware stories show up in reviews—scan for recurring complaints.");
      break;
    case "generic_electronics":
      bullets.push("Warranty length and authorized-seller status matter more when discounts are steep.");
      break;
    default:
      bullets.push("Align listing title with your intent—ambiguous SKUs are a top source of buyer regret.");
  }

  return { subcategory: sub, bullets: bullets.slice(0, 4) };
}

export function categorySlugForProduct(query: string, title: string): ProductCategorySlug {
  return inferProductCategory(query, title);
}
