/**
 * QuantAI product relationship graph — peer edges in a tray for substitutes,
 * upgrades, aesthetic matches, and discovery intelligence (no UI).
 */

import type { QuantProduct } from "@/lib/shoppingScore";
import { getFinalComposite, getStoreTrustScore, ratingValue } from "@/lib/shoppingScore";
import { combinedTitleSimilarity } from "@/lib/deals/normalizeTitle";
import type { CommerceSearchIntents } from "@/lib/intelligence/searchIntentV2";
import type { AlternativeQueryContext } from "@/lib/commerce-os/alternativeSemantics";
import type { TasteGraphSignals } from "@/lib/commerce-os/tasteGraph";
import { tasteProductAlignment01 } from "@/lib/commerce-os/tasteGraph";
import { universalSimilarity01 } from "@/lib/intelligence/universalSimilarity";
import type { ProductRelationshipBundle, ProductRelationshipRef, RelationshipEdgeKind } from "@/lib/intelligence/relationshipTypes";

export type { ProductRelationshipBundle, ProductRelationshipRef, RelationshipEdgeKind } from "@/lib/intelligence/relationshipTypes";

const MAX_REF = 2;

function refFrom(peer: QuantProduct, strength: number, kind: RelationshipEdgeKind): ProductRelationshipRef {
  return {
    link: peer.link,
    title: peer.title,
    store: peer.store,
    price: peer.price,
    strength: Math.round(strength * 100) / 100,
    kind,
  };
}

function pushTop(bucket: ProductRelationshipRef[], r: ProductRelationshipRef, max = MAX_REF) {
  bucket.push(r);
  bucket.sort((a, b) => b.strength - a.strength);
  while (bucket.length > max) bucket.pop();
}

function lifestyleBlob(title: string, extensions: string[]): string {
  return `${title} ${extensions.join(" ")}`.toLowerCase();
}

function lifestyleOverlap01(a: string, b: string): number {
  const keys = [
    "gym",
    "yoga",
    "office",
    "desk",
    "travel",
    "kitchen",
    "bedroom",
    "gaming",
    "minimal",
    "luxury",
    "sport",
    "running",
    "wireless",
    "noise",
    "vacuum",
    "hair",
    "skin",
    "watch",
    "leather",
  ];
  let n = 0;
  for (const k of keys) {
    if (a.includes(k) && b.includes(k)) n++;
  }
  return Math.min(1, n / 4);
}

function estimateSubstituteRisk01(
  p: QuantProduct,
  query: string,
  anchor: string,
  intents: CommerceSearchIntents
): number {
  if (!intents.substituteSemanticActive && !intents.alternativeSeeking) return 0;
  const trust = getStoreTrustScore(p.store);
  const disc =
    p.oldPrice != null && p.oldPrice > p.price && p.price > 0 ? (p.oldPrice - p.price) / p.oldPrice : 0;
  const titleSim = anchor.length >= 2 ? combinedTitleSimilarity(anchor, p.title) : 0;
  let risk = 0;
  if (titleSim >= 0.42 && trust < 54 && disc >= 0.35) risk += 0.55;
  if (titleSim >= 0.55 && /\b(rolex|dyson|apple|iphone|airpods)\b/i.test(query) && trust < 62 && disc >= 0.28) {
    risk += 0.25;
  }
  if (/\b(replica|clone|copy\s+of|inspired\s+by)\b/i.test(p.title)) risk += 0.45;
  return Math.min(1, risk);
}

export function buildProductRelationshipBundle(
  p: QuantProduct,
  list: QuantProduct[],
  query: string,
  alt: AlternativeQueryContext,
  intents: CommerceSearchIntents,
  taste: TasteGraphSignals
): ProductRelationshipBundle {
  const anchor = alt.anchorPhrase.trim().length >= 2 ? alt.anchorPhrase : query;
  const uni = universalSimilarity01(p, list, query, alt.anchorPhrase, taste);
  const risk = estimateSubstituteRisk01(p, query, anchor, intents);

  const similarTo: ProductRelationshipRef[] = [];
  const cheaperAlternative: ProductRelationshipRef[] = [];
  const premiumAlternative: ProductRelationshipRef[] = [];
  const aestheticMatch: ProductRelationshipRef[] = [];
  const sameLifestyleFit: ProductRelationshipRef[] = [];
  const complementaryProduct: ProductRelationshipRef[] = [];
  const longTermUpgrade: ProductRelationshipRef[] = [];

  const myComp = getFinalComposite(p, list);
  const myPrice = p.price > 0 ? p.price : Number.POSITIVE_INFINITY;
  const myBlob = lifestyleBlob(p.title, p.extensions);

  const peers = list.filter((x) => x.link !== p.link);
  for (const peer of peers) {
    const tsim = combinedTitleSimilarity(p.title, peer.title);
    const peerComp = getFinalComposite(peer, list);
    const peerPrice = peer.price > 0 ? peer.price : 0;
    const peerTrust = getStoreTrustScore(peer.store);
    const peerStars = ratingValue(peer.rating);

    if (tsim >= 0.14) {
      pushTop(similarTo, refFrom(peer, tsim, "similarTo"));
    }

    if (peerPrice > 0 && myPrice < Number.POSITIVE_INFINITY && peerPrice < myPrice * 0.9 && tsim >= 0.1) {
      const s = tsim * 0.55 + (peerTrust / 100) * 0.45;
      pushTop(cheaperAlternative, refFrom(peer, s, "cheaperAlternative"));
    }

    if (peerPrice > myPrice * 1.08 && peerComp >= myComp - 2) {
      const s = Math.min(1, (peerComp / 100) * 0.5 + (peerPrice / Math.max(myPrice, 1) - 1) * 0.15);
      pushTop(premiumAlternative, refFrom(peer, s, "premiumAlternative"));
    }

    if (taste.hasTasteLayer) {
      const a1 = tasteProductAlignment01(p, taste);
      const a2 = tasteProductAlignment01(peer, taste);
      if (a1 > 0.2 && a2 > 0.2 && tsim >= 0.08) {
        pushTop(aestheticMatch, refFrom(peer, (a1 + a2) * 0.5 * (0.5 + tsim * 0.5), "aestheticMatch"));
      }
    }

    const lb = lifestyleBlob(peer.title, peer.extensions);
    const lo = lifestyleOverlap01(myBlob, lb);
    if (lo >= 0.35 && tsim >= 0.06) {
      pushTop(sameLifestyleFit, refFrom(peer, lo * (0.55 + tsim * 0.45), "sameLifestyleFit"));
    }

    if (peerComp >= myComp + 8 && peerPrice > myPrice * 1.05 && peerTrust >= 68 && peerStars >= 4.0) {
      pushTop(longTermUpgrade, refFrom(peer, Math.min(1, (peerComp - myComp) / 25), "longTermUpgrade"));
    }

    if (tsim >= 0.06 && tsim <= 0.22 && Math.abs(peerPrice - myPrice) / Math.max(myPrice, peerPrice, 1) < 0.35) {
      pushTop(
        complementaryProduct,
        refFrom(peer, (1 - tsim) * 0.35 + lo * 0.25, "complementaryProduct")
      );
    }
  }

  if (alt.wantsCheaper && cheaperAlternative.length === 0) {
    for (const peer of peers) {
      const peerPrice = peer.price > 0 ? peer.price : 0;
      if (peerPrice > 0 && peerPrice < myPrice * 0.92) {
        const qsim = combinedTitleSimilarity(anchor, peer.title);
        if (qsim >= 0.12) {
          pushTop(
            cheaperAlternative,
            refFrom(peer, qsim * 0.7 + (getStoreTrustScore(peer.store) / 100) * 0.3, "cheaperAlternative")
          );
        }
      }
    }
  }

  return {
    similarTo,
    cheaperAlternative,
    premiumAlternative,
    aestheticMatch,
    sameLifestyleFit,
    complementaryProduct,
    longTermUpgrade,
    universalSimilarity01: Math.round(uni * 1000) / 1000,
    substituteRisk01: Math.round(risk * 1000) / 1000,
  };
}
