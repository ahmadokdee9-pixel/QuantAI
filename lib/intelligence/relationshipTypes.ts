/** Product relationship graph DTOs (types only — safe for shoppingScore imports). */

export type RelationshipEdgeKind =
  | "similarTo"
  | "cheaperAlternative"
  | "premiumAlternative"
  | "aestheticMatch"
  | "sameLifestyleFit"
  | "complementaryProduct"
  | "longTermUpgrade";

export type ProductRelationshipRef = {
  link: string;
  title: string;
  store: string;
  price: number;
  strength: number;
  kind: RelationshipEdgeKind;
};

export type ProductRelationshipBundle = {
  similarTo: ProductRelationshipRef[];
  cheaperAlternative: ProductRelationshipRef[];
  premiumAlternative: ProductRelationshipRef[];
  aestheticMatch: ProductRelationshipRef[];
  sameLifestyleFit: ProductRelationshipRef[];
  complementaryProduct: ProductRelationshipRef[];
  longTermUpgrade: ProductRelationshipRef[];
  universalSimilarity01: number;
  substituteRisk01: number;
};
