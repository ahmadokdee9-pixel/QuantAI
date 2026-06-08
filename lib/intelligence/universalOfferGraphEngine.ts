/**
 * Phase 37 — Universal Offer Graph.
 * Every offer is a node; every product entity may contain many merchant offers.
 */

import type { QuantProduct } from "@/lib/shoppingScore";
import { createCanonicalProductIdentity } from "@/lib/intelligence/productIdentity";
import { buildUnifiedMarketGroups } from "@/lib/intelligence/unifiedMarketMatching";

export type MerchantChannel =
  | "marketplace"
  | "retailer"
  | "brand_store"
  | "refurbished"
  | "outlet"
  | "clearance"
  | "local"
  | "regional"
  | "international";

export type OfferNode = {
  link: string;
  store: string;
  price: number;
  channel: MerchantChannel;
  condition: string;
  entityId: string;
};

export type ProductEntity = {
  entityId: string;
  canonicalKey: string;
  normalizedTitle: string;
  offers: OfferNode[];
  merchantChannels: MerchantChannel[];
  offerCount: number;
  lowestPrice: number;
  highestPrice: number;
};

export type UniversalOfferGraph = {
  version: 1;
  entities: ProductEntity[];
  totalOffers: number;
  totalEntities: number;
  merchantCoverage: MerchantChannel[];
  storeCount: number;
  searchDepthScore: number;
};

function classifyMerchantChannel(store: string, title: string): MerchantChannel {
  const blob = `${store} ${title}`.toLowerCase();
  if (/refurb|renewed|certified pre-owned|back market|backmarket|swappa|recommerce/i.test(blob)) return "refurbished";
  if (/outlet|factory store|nike outlet|adidas outlet/i.test(blob)) return "outlet";
  if (/clearance|liquidation|closeout|overstock/i.test(blob)) return "clearance";
  if (/apple store|samsung\.com|nike\.com|adidas\.com|dyson\.com|sony\.com/i.test(blob)) return "brand_store";
  if (/amazon|ebay|bol\.com|etsy|walmart|aliexpress|temu|rakuten|cdiscount|fnac/i.test(blob)) return "marketplace";
  if (/local|near me|pickup/i.test(blob)) return "local";
  if (/\.nl|\.de|\.fr|\.es|\.it|coolblue|mediamarkt|bol|wehkamp|zalando/i.test(blob)) return "regional";
  if (/\.com|\.co\.uk|\.us|international|global/i.test(blob)) return "international";
  return "retailer";
}

function normalizeCondition(title: string, availability: string): string {
  const blob = `${title} ${availability}`.toLowerCase();
  if (/refurb|renewed|pre-owned|used|open box/i.test(blob)) return "refurbished";
  if (/new|factory sealed|brand new/i.test(blob)) return "new";
  return "standard";
}

/** Build universal offer graph from tray — models global search universe locally. */
export function buildUniversalOfferGraph(tray: QuantProduct[], searchQuery = ""): UniversalOfferGraph {
  const groups = buildUnifiedMarketGroups(tray, searchQuery);
  const entityByKey = new Map<string, ProductEntity>();
  const channels = new Set<MerchantChannel>();
  const stores = new Set<string>();

  for (const group of groups) {
    const members = group.memberIndices.map((i) => tray[i]!);
    const canonicalKey = simpleEntityKey(members);
    const entityId = group.familyId;

    let entity = entityByKey.get(entityId);
    if (!entity) {
      entity = {
        entityId,
        canonicalKey,
        normalizedTitle: members[0]?.title ?? "",
        offers: [],
        merchantChannels: [],
        offerCount: 0,
        lowestPrice: Number.POSITIVE_INFINITY,
        highestPrice: 0,
      };
      entityByKey.set(entityId, entity);
    }

    for (const product of members) {
      const channel = classifyMerchantChannel(product.store, product.title);
      channels.add(channel);
      stores.add(product.store.toLowerCase());

      entity.offers.push({
        link: product.link,
        store: product.store,
        price: product.price,
        channel,
        condition: normalizeCondition(product.title, product.availability ?? ""),
        entityId,
      });
      if (!entity.merchantChannels.includes(channel)) entity.merchantChannels.push(channel);
      if (product.price > 0) {
        entity.lowestPrice = Math.min(entity.lowestPrice, product.price);
        entity.highestPrice = Math.max(entity.highestPrice, product.price);
      }
    }
    entity.offerCount = entity.offers.length;
  }

  for (const product of tray) {
    if ([...entityByKey.values()].some((e) => e.offers.some((o) => o.link === product.link))) continue;
    const identity = createCanonicalProductIdentity(product);
    const entityId = `solo_${identity.canonicalKey}`;
    const channel = classifyMerchantChannel(product.store, product.title);
    channels.add(channel);
    stores.add(product.store.toLowerCase());

    entityByKey.set(entityId, {
      entityId,
      canonicalKey: identity.canonicalKey,
      normalizedTitle: product.title,
      offers: [
        {
          link: product.link,
          store: product.store,
          price: product.price,
          channel,
          condition: normalizeCondition(product.title, product.availability ?? ""),
          entityId,
        },
      ],
      merchantChannels: [channel],
      offerCount: 1,
      lowestPrice: product.price,
      highestPrice: product.price,
    });
  }

  const entities = [...entityByKey.values()];
  const totalOffers = entities.reduce((sum, e) => sum + e.offerCount, 0);
  const searchDepthScore = Math.min(
    100,
    Math.round(stores.size * 4 + channels.size * 8 + Math.min(40, totalOffers * 1.5))
  );

  return {
    version: 1,
    entities,
    totalOffers,
    totalEntities: entities.length,
    merchantCoverage: [...channels],
    storeCount: stores.size,
    searchDepthScore,
  };
}

function simpleEntityKey(members: QuantProduct[]): string {
  const keys = members.map((p) => createCanonicalProductIdentity(p).canonicalKey).sort();
  return keys[0] ?? "unknown";
}

export function findEntityForOffer(graph: UniversalOfferGraph, link: string): ProductEntity | null {
  return graph.entities.find((e) => e.offers.some((o) => o.link === link)) ?? null;
}
