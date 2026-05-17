/**
 * Direct merchant outbound routing — prefer store-native product/search URLs over Google interstitials.
 * Preserves query strings on already-direct merchant links (affiliate / tracking).
 */

import {
  isGoogleShoppingInterstitial,
  isGoogleUrl,
  unwrapGoogleToNonGoogle,
} from "@/lib/search/googleShoppingUrls";

export type OutboundRouteKind = "direct_merchant" | "merchant_search" | "google_interstitial" | "google_fallback";

export type OutboundResolution = {
  href: string;
  kind: OutboundRouteKind;
};

function qEnc(q: string): string {
  return encodeURIComponent(q.replace(/\s+/g, " ").trim().slice(0, 140));
}

/** Normalize feed `store` label to an internal merchant key (lowercase slug). */
export function normalizeMerchantName(store: string): string {
  const s = store.toLowerCase().replace(/\s+/g, " ").trim();
  if (!s) return "unknown";
  const tests: [RegExp, string][] = [
    [/bol\.com|^bol\b/i, "bol"],
    [/coolblue/i, "coolblue"],
    [/amazon/i, "amazon"],
    [/\bebay\b/i, "ebay"],
    [/marktplaats/i, "marktplaats"],
    [/media\s*markt|mediamarkt/i, "mediamarkt"],
    [/\bfnac\b/i, "fnac"],
    [/galaxus/i, "galaxus"],
    [/kaufland/i, "kaufland"],
    [/\botto\b/i, "otto"],
    [/alternate/i, "alternate"],
    [/azerty/i, "azerty"],
    [/megekko/i, "megekko"],
    [/belsimpel/i, "belsimpel"],
    [/back\s*market|backmarket/i, "backmarket"],
    [/zalando/i, "zalando"],
    [/about\s*you|aboutyou/i, "aboutyou"],
    [/\bh\s*&\s*m\b|^hm\b/i, "hm"],
    [/\bzara\b/i, "zara"],
    [/foot\s*locker|footlocker/i, "footlocker"],
    [/jd\s*sports|jdsports/i, "jdsports"],
    [/\bnike\b/i, "nike"],
    [/\badidas\b/i, "adidas"],
    [/ikea/i, "ikea"],
    [/leen\s*bakker/i, "leenbakker"],
    [/wehkamp/i, "wehkamp"],
    [/blokker/i, "blokker"],
    [/\bhema\b/i, "hema"],
    [/praxis/i, "praxis"],
    [/gamma/i, "gamma"],
    [/hornbach/i, "hornbach"],
    [/douglas/i, "douglas"],
    [/notino/i, "notino"],
    [/bolia/i, "bolia"],
    [/\bfonq\b/i, "fonq"],
    [/vidaxl/i, "vidaxl"],
    [/westwing/i, "westwing"],
    [/\bjysk\b/i, "jysk"],
    [/beter\s*bed|beterbed/i, "beterbed"],
    [/sephora/i, "sephora"],
    [/\basos\b/i, "asos"],
    [/parfumdreams/i, "parfumdreams"],
    [/decathlon/i, "decathlon"],
    [/\bapple\b/i, "apple"],
    [/\bsamsung\b/i, "samsung"],
    [/dyson/i, "dyson"],
    [/philips/i, "philips"],
    [/\baction\b/i, "action"],
    [/aliexpress/i, "aliexpress"],
    [/\btemu\b/i, "temu"],
  ];
  for (const [rx, key] of tests) {
    if (rx.test(s)) return key;
  }
  return "unknown";
}

function amazonSearchBase(geoGl: string): string {
  const g = geoGl.toLowerCase();
  if (g === "nl") return "https://www.amazon.nl/s?k=";
  if (g === "de") return "https://www.amazon.de/s?k=";
  if (g === "fr") return "https://www.amazon.fr/s?k=";
  if (g === "uk" || g === "gb") return "https://www.amazon.co.uk/s?k=";
  if (g === "es") return "https://www.amazon.es/s?k=";
  if (g === "it") return "https://www.amazon.it/s?k=";
  if (g === "be") return "https://www.amazon.nl/s?k=";
  return "https://www.amazon.com/s?k=";
}

/** When a stable product path is known (rare from Shopping JSON), build absolute URL. */
export function buildMerchantProductUrl(merchantKey: string, productPathOrId: string): string | null {
  const id = productPathOrId.trim();
  if (!id) return null;
  switch (merchantKey) {
    case "bol":
      if (/^\d+$/.test(id)) return `https://www.bol.com/nl/nl/p/-/${id}/`;
      return null;
    default:
      return null;
  }
}

/** Store-native search URL (never Google) for discovery fallback. */
export function buildMerchantSearchUrl(merchantKey: string, searchTerms: string, geoGl: string): string | null {
  const q = searchTerms.replace(/\s+/g, " ").trim();
  if (!q) return null;
  switch (merchantKey) {
    case "bol":
      return `https://www.bol.com/nl/nl/s/?searchtext=${qEnc(q)}`;
    case "coolblue":
      return `https://www.coolblue.nl/zoeken?query=${qEnc(q)}`;
    case "amazon":
      return `${amazonSearchBase(geoGl)}${qEnc(q)}`;
    case "amazon_de":
      return `https://www.amazon.de/s?k=${qEnc(q)}`;
    case "ebay":
      return `https://www.ebay.nl/sch/i.html?_nkw=${qEnc(q)}`;
    case "marktplaats":
      return `https://www.marktplaats.nl/q/${qEnc(q)}/`;
    case "mediamarkt":
      return `https://www.mediamarkt.nl/nl/search.html?query=${qEnc(q)}`;
    case "fnac":
      return `https://www.fnac.com/SearchResult/ResultList.aspx?Search=${qEnc(q)}`;
    case "galaxus":
      return `https://www.galaxus.nl/en/search?q=${qEnc(q)}`;
    case "kaufland":
      return `https://www.kaufland.de/s/?search_value=${qEnc(q)}`;
    case "otto":
      return `https://www.otto.de/suche/${qEnc(q)}/`;
    case "alternate":
      return `https://www.alternate.nl/listing.xhtml?q=${qEnc(q)}`;
    case "azerty":
      return `https://azerty.nl/search?search=${qEnc(q)}`;
    case "megekko":
      return `https://www.megekko.nl/Computer/zoek?f=${qEnc(q)}`;
    case "belsimpel":
      return `https://www.belsimpel.nl/zoeken?q=${qEnc(q)}`;
    case "backmarket":
      return `https://www.backmarket.nl/nl-nl/search?q=${qEnc(q)}`;
    case "zalando":
      return `https://www.zalando.nl/catalog/?q=${qEnc(q)}`;
    case "aboutyou":
      return `https://www.aboutyou.nl/zoeken?searchTerm=${qEnc(q)}`;
    case "hm":
      return `https://www2.hm.com/nl_nl/search-results.html?q=${qEnc(q)}`;
    case "zara":
      return `https://www.zara.com/nl/en/search?searchTerm=${qEnc(q)}`;
    case "nike":
      return `https://www.nike.com/nl/w?q=${qEnc(q)}`;
    case "adidas":
      return `https://www.adidas.nl/search?q=${qEnc(q)}`;
    case "ikea":
      return `https://www.ikea.com/nl/nl/search/?q=${qEnc(q)}`;
    case "praxis":
      return `https://www.praxis.nl/search?text=${qEnc(q)}`;
    case "gamma":
      return `https://www.gamma.nl/assortiment/zoeken?text=${qEnc(q)}`;
    case "hornbach":
      return `https://www.hornbach.nl/shop/zoeken/sortiment/${qEnc(q)}/`;
    case "leenbakker":
      return `https://www.leenbakker.nl/search?SearchTerm=${qEnc(q)}`;
    case "wehkamp":
      return `https://www.wehkamp.nl/wehkamp/search/?text=${qEnc(q)}`;
    case "blokker":
      return `https://www.blokker.nl/zoeken?q=${qEnc(q)}`;
    case "hema":
      return `https://www.hema.nl/zoeken?q=${qEnc(q)}`;
    case "douglas":
      return `https://www.douglas.nl/nl/search?q=${qEnc(q)}`;
    case "notino":
      return `https://www.notino.nl/search?q=${qEnc(q)}`;
    case "bolia":
      return `https://www.bolia.com/nl-nl/zoeken/?q=${qEnc(q)}`;
    case "fonq":
      return `https://www.fonq.nl/zoeken/?q=${qEnc(q)}`;
    case "vidaxl":
      return `https://www.vidaxl.nl/catalogsearch/result?q=${qEnc(q)}`;
    case "westwing":
      return `https://www.westwing.nl/search/?q=${qEnc(q)}`;
    case "jysk":
      return `https://jysk.nl/search?query=${qEnc(q)}`;
    case "beterbed":
      return `https://www.beterbed.nl/zoeken?query=${qEnc(q)}`;
    case "sephora":
      return `https://www.sephora.com/search?keyword=${qEnc(q)}`;
    case "asos":
      return `https://www.asos.com/search/?q=${qEnc(q)}`;
    case "footlocker":
      return `https://www.footlocker.nl/en/search?query=${qEnc(q)}`;
    case "jdsports":
      return `https://www.jdsports.nl/search/${qEnc(q)}/`;
    case "parfumdreams":
      return `https://www.parfumdreams.nl/Search.html?search=${qEnc(q)}`;
    case "decathlon":
      return `https://www.decathlon.nl/search?Ntt=${qEnc(q)}`;
    case "apple":
      return `https://www.apple.com/nl/search/${encodeURIComponent(q)}`;
    case "samsung":
      return `https://www.samsung.com/nl/search/?query=${qEnc(q)}`;
    case "dyson":
      return `https://www.dyson.nl/search?q=${qEnc(q)}`;
    case "philips":
      return `https://www.philips.nl/c-w/search/search#q=${qEnc(q)}`;
    case "action":
      return `https://www.action.com/nl-nl/search/?q=${qEnc(q)}`;
    case "aliexpress":
      return `https://www.aliexpress.com/wholesale?SearchText=${qEnc(q)}`;
    case "temu":
      return `https://www.temu.com/search_result.html?search_key=${qEnc(q)}`;
    default:
      return null;
  }
}

function classifyHref(href: string): OutboundRouteKind {
  if (!href.startsWith("http")) return "google_fallback";
  if (!isGoogleUrl(href)) return "direct_merchant";
  if (isGoogleShoppingInterstitial(href)) return "google_interstitial";
  return "google_fallback";
}

export function resolveBestOutboundUrl(input: {
  link: string;
  store: string;
  title: string;
  /** SerpAPI `gl` used for Amazon TLD selection. */
  geoGl?: string;
}): OutboundResolution {
  const { link, store, title } = input;
  const geoGl = (input.geoGl ?? "nl").trim().slice(0, 4) || "nl";

  const unwrapped = unwrapGoogleToNonGoogle(link);
  if (unwrapped && !isGoogleUrl(unwrapped)) {
    return { href: unwrapped, kind: "direct_merchant" };
  }

  if (link.startsWith("http") && !isGoogleUrl(link) && !isGoogleShoppingInterstitial(link)) {
    return { href: link, kind: "direct_merchant" };
  }

  const merchantKey = normalizeMerchantName(store);
  const search = buildMerchantSearchUrl(merchantKey, title, geoGl);
  if (search && merchantKey !== "unknown") {
    return { href: search, kind: "merchant_search" };
  }

  if (link.startsWith("http")) {
    return { href: link, kind: classifyHref(link) };
  }

  return { href: "#", kind: "google_fallback" };
}
