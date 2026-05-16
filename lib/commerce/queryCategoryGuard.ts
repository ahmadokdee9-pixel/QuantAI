import { latinSkeletonForMatching } from "@/lib/search/queryScriptNormalize";

/**
 * Hard guard when listing category obviously diverges from query intent (pre-score hygiene).
 */
export function hardCategoryMismatch(query: string, title: string): boolean {
  const qRaw = query.toLowerCase();
  const qLatin = latinSkeletonForMatching(query).toLowerCase();
  const q = `${qRaw} ${qLatin}`.replace(/\s+/g, " ").trim();
  const t = title.toLowerCase();
  const furniture =
    /\b(sofa|couch|loveseat|sectional|futon|ottoman|rug|curtain|dining\s+table|coffee\s+table|bookshelf|wardrobe|dresser|nightstand|bed\s+frame)\b/;
  const compute =
    /\b(laptop|notebook|ultrabook|macbook|thinkpad|chromebook|gpu|graphics\s+card|rtx|gtx|cpu|processor|monitor|oled\s+tv)\b/;
  const mobile = /\b(iphone|ipad|galaxy\s+s\d|pixel\s+\d|smartphone|airpods)\b/;
  const audioSmall = /\b(earbuds|earphones|headphones|wh-1000)\b/;
  const sneakers =
    /\b(sneaker|trainer|air\s*force|jordan|yeezy|running\s+shoe|footwear|nike\s+shoe|adidas\s+shoe)\b/;
  const perfume = /\b(perfume|fragrance|parfum|cologne|eau\s+de|edt|edp)\b/;
  const gpuCpu = /\b(gpu|graphics|rtx|gtx|processor|cpu|motherboard)\b/;

  if (compute.test(q) && furniture.test(t)) return true;
  if (mobile.test(q) && furniture.test(t)) return true;
  if (/\b(tv|television|qled|oled\s+tv)\b/.test(q) && /\b(laptop|macbook|gpu|earbuds)\b/.test(t)) return true;
  if (audioSmall.test(q) && furniture.test(t)) return true;

  if (sneakers.test(q) && (furniture.test(t) || gpuCpu.test(t) || /\b(laptop|monitor)\b/.test(t))) return true;
  if (perfume.test(q) && (furniture.test(t) || gpuCpu.test(t) || /\b(laptop|phone|iphone)\b/.test(t))) return true;
  if (gpuCpu.test(q) && perfume.test(t)) return true;
  if (/\b(laptop|gaming\s+laptop)\b/.test(q) && sneakers.test(t)) return true;

  return false;
}
