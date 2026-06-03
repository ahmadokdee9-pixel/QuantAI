/**
 * Mixed Arabic + English commerce queries: keep Latin product tokens for Shopping,
 * category gates, and intent regexes while normalizing digits and common Arabic shopping words.
 */

const EASTERN_DIGIT_MAP: Record<string, string> = {
  "٠": "0",
  "١": "1",
  "٢": "2",
  "٣": "3",
  "٤": "4",
  "٥": "5",
  "٦": "6",
  "٧": "7",
  "٨": "8",
  "٩": "9",
  "۰": "0",
  "۱": "1",
  "۲": "2",
  "۳": "3",
  "۴": "4",
  "۵": "5",
  "۶": "6",
  "۷": "7",
  "۸": "8",
  "۹": "9",
};

/** Arabic / Persian-Indic numerals → Western digits (budget extraction, model numbers). */
export function normalizeEasternDigitsInString(s: string): string {
  let out = "";
  for (const ch of s) {
    out += EASTERN_DIGIT_MAP[ch] ?? ch;
  }
  return out;
}

const AR_SCRIPT =
  /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]+/g;

/** Strip Arabic script blocks — leaves Latin, digits, currency symbols for category / tokenizers. */
export function latinSkeletonForMatching(s: string): string {
  const cleaned = normalizeEasternDigitsInString(s).replace(AR_SCRIPT, " ");
  return cleaned.replace(/\s+/g, " ").trim();
}

const AR_GLOSSES: { rx: RegExp; en: string }[] = [
  { rx: /(?:لابتوب|كمبيوتر\s*محمول|حاسوب\s*محمول)/i, en: " laptop " },
  { rx: /(?:هاتف|جوال|موبايل|تليفون)/i, en: " phone " },
  { rx: /(?:سماعة|سماعات)/i, en: " headphones " },
  { rx: /(?:تلفزيون|شاشة|أوليد|اوليد)/i, en: " TV OLED monitor " },
  { rx: /(?:ساعة\s*فاخرة|ساعة\s*راقية|شكلها\s*luxury|شكلها\s*فخم)/i, en: " luxury dress watch automatic swiss men's " },
  { rx: /(?:ساعة\s*ذكية)/i, en: " smartwatch fitness tracker " },
  { rx: /(?:ساعة)/i, en: " watch horloge wristwatch " },
  { rx: /(?:رخيص|ارخص|أرخص|تخفيض|خصم|ديسكاونت)/i, en: " cheap discount " },
  { rx: /(?:افضل|أفضل|احسن|أحسن)/i, en: " best " },
  { rx: /(?:مناسب|مناسبة)/i, en: " suitable " },
  { rx: /(?:قوي|قوية)/i, en: " powerful performance " },
  { rx: /(?:اصل|أصلي|اصلي|أصلية)/i, en: " original authentic genuine " },
  { rx: /(?:جودة|جوده)/i, en: " quality " },
  { rx: /(?:ضد\s*الماء|مقاوم\s*للماء)/i, en: " waterproof water resistant " },
  { rx: /(?:للبرمجة|برمجة)/i, en: " programming developer coding " },
  { rx: /(?:موثوق|آمن|ثقة)/i, en: " trusted " },
  { rx: /(?:تحت|أقل\s*من|اقل\s*من|ما\s*يعادل|حتى)/i, en: " under " },
  { rx: /(?:هدية|لزوجتي|لزوجي)/i, en: " gift " },
  { rx: /(?:للمدرسة|للجامعة)/i, en: " student school " },
  { rx: /(?:مقارنة|فرق\s*بين)/i, en: " compare " },
  { rx: /(?:ألعاب|قيمنق|جيمنق)/i, en: " gaming " },
  { rx: /(?:شاشة\s*كمبيوتر|مونيتور)/i, en: " monitor display " },
  { rx: /(?:عطر|بارفان|كولونيا)/i, en: " perfume fragrance cologne " },
  { rx: /(?:أثاث|كنبة|طاولة\s*طعام|سرير)/i, en: " furniture sofa dining table bed " },
  { rx: /(?:للسيارة|سيارة|سيارتي)/i, en: " car automotive accessory " },
  { rx: /(?:رياضة|للرياضة|جيم|للجيم)/i, en: " fitness gym workout " },
  { rx: /(?:مكتب|مكتبي|للمكتب)/i, en: " office desk work " },
  { rx: /(?:تركيز|للتركيز|للدراسة)/i, en: " focus study concentration " },
  { rx: /(?:مثل|شبيه|بديل|زي|شبه)/i, en: " like similar alternative " },
  { rx: /(?:أرخص\s*من|ارخص\s*من|بس\s*ارخص|بس\s*أرخص)/i, en: " cheaper budget alternative " },
  { rx: /(?:كنبة|كنبه)/i, en: " sofa couch " },
  { rx: /(?:يف\s+سان\s+لوران|ويف\s+سان\s+لوران|ysl)/i, en: " yves saint laurent perfume libre " },
  { rx: /(?:جزمة|حذاء|احذية|أحذية)/i, en: " shoe sneakers trainers " },
  { rx: /(?:كرسي)/i, en: " chair office " },
  { rx: /(?:ساعة\s*فاخرة|ساعة\s*راقية)/i, en: " luxury watch " },
  { rx: /(?:تيتانيوم)/i, en: " titanium " },
  { rx: /(?:برو\s*ماكس|برو\s*مكس)/i, en: " pro max " },
];

/** English tokens implied by Arabic shopping vocabulary (for intent + Shopping recall). */
export function arabicIntentGlossTokens(q: string): string {
  let add = "";
  const s = normalizeEasternDigitsInString(q);
  for (const { rx, en } of AR_GLOSSES) {
    if (rx.test(s)) add += en;
  }
  return add;
}

/** Digit-normalize then append gloss tokens (caller may strip Arabic script separately). */
export function appendArabicCommerceGlosses(q: string): string {
  const base = normalizeEasternDigitsInString(q);
  return base + arabicIntentGlossTokens(base);
}
