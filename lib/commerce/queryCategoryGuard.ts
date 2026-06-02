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
  const camera = /\b(camera|instax|fujifilm|dslr|mirrorless|webcam)\b/;
  const keyboard = /\b(keyboard|mechanical\s+keyboard|keycap)\b/;
  const deskAccessory =
    /\b(desk\s+organizer|cable\s+management|monitor\s+arm|monitor\s+mount|dual\s+monitor|standing\s+desk|sit[-\s]?stand)\b/;
  const runningShoe = /\b(running\s+shoe|flat\s+feet|stability\s+shoe|overpronation)\b/;
  const lifestyleShoe = /\b(air\s+force|handball\s+spezial|3mc|lifestyle\s+sneaker|dunk|samba)\b/;
  const beautyExact = /\b(lipstick|ruby\s+woo|cerave|retinol|moisturiz)/;
  const sticker = /\b(sticker|decal|pin|badge|poster|patch)\b/;
  const gamingHeadset = /\b(gaming\s+headset|wireless\s+gaming\s+headset|ps5\s+headset)\b/;

  if (compute.test(q) && furniture.test(t)) return true;
  if (mobile.test(q) && furniture.test(t)) return true;
  if (/\b(tv|television|qled|oled\s+tv)\b/.test(q) && /\b(laptop|macbook|gpu|earbuds)\b/.test(t)) return true;
  if (audioSmall.test(q) && furniture.test(t)) return true;

  if (sneakers.test(q) && (furniture.test(t) || gpuCpu.test(t) || /\b(laptop|monitor)\b/.test(t))) return true;
  if (perfume.test(q) && (furniture.test(t) || gpuCpu.test(t) || /\b(laptop|phone|iphone)\b/.test(t))) return true;
  if (gpuCpu.test(q) && perfume.test(t)) return true;
  if (/\b(laptop|gaming\s+laptop)\b/.test(q) && sneakers.test(t)) return true;

  // Phase 3 — hard category protection (QA audit failures)
  if (gpuCpu.test(q) && camera.test(t) && !gpuCpu.test(t)) return true;
  if (keyboard.test(q) && camera.test(t) && !keyboard.test(t)) return true;
  if (deskAccessory.test(q) && furniture.test(t) && !deskAccessory.test(t)) return true;
  if (runningShoe.test(q) && lifestyleShoe.test(t) && !/\b(running|support|stability|gel|kayano)\b/.test(t)) return true;
  if (beautyExact.test(q) && sticker.test(t)) return true;
  if (gamingHeadset.test(q) && camera.test(t)) return true;
  if (gpuCpu.test(q) && keyboard.test(t) && !gpuCpu.test(t)) return true;

  return false;
}
