"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { ExternalLink } from "lucide-react";
import type { QuantProduct } from "@/lib/shoppingScore";
import { currencySymbolFromListing, formatListingPrice } from "@/lib/commerce/cues";
import { getStoreTrustScore } from "@/lib/shoppingScore";
import { classifyListingOutlier } from "@/lib/ui/listingOutlierFilter";
import { deriveCardDecision } from "@/lib/ui/decisionLanguage";
import { INTEL_TERMS } from "@/lib/ui/intelligenceTerminology";
import { resolveProductImageDisplay } from "@/lib/ui/productImageQuality";

type Props = {
  products: QuantProduct[];
  list: QuantProduct[];
  onOpen: (product: QuantProduct) => void;
  onCompareTopTwo?: () => void;
  showCompareCta?: boolean;
};

type EnrichedPick = {
  product: QuantProduct;
  decision: ReturnType<typeof deriveCardDecision>;
  trust: number;
};

function enrich(products: QuantProduct[], list: QuantProduct[]): EnrichedPick[] {
  return products.map((product) => {
    const trust = getStoreTrustScore(product.store);
    const decision = deriveCardDecision({
      trustScore: trust,
      weakRetailer: trust < 52,
      pricePosture: "fair",
      suspiciousPrice:
        classifyListingOutlier(product, list) != null ||
        product.qiCommerce?.priceAnomaly === "suspicious_low" ||
        product.qiCommerce?.priceAnomaly === "premium_outlier",
      peerCount: list.length,
    });
    return { product, decision, trust };
  });
}

function PickCard({
  pick,
  variant,
  onOpen,
}: {
  pick: EnrichedPick;
  variant: "lead" | "alt" | "watch" | "low";
  onOpen: (product: QuantProduct) => void;
}) {
  const { product: p, decision, trust } = pick;
  const sym = currencySymbolFromListing(p);
  const verdictClass = decision.verdict.replace(/\s+/g, "-").toLowerCase();
  const image = resolveProductImageDisplay(p);

  if (variant === "lead") {
    return (
      <article
        className={`qa-ref-top-recs__spotlight qa-ref-top-recs__spotlight--${verdictClass}`}
        data-verdict={decision.verdict}
      >
        <div className="qa-ref-top-recs__spotlight-hero">
          {image.showImage && image.src ? (
            <img src={image.src} alt="" className="qa-ref-top-recs__spotlight-img" loading="eager" />
          ) : (
            <div className="qa-ref-top-recs__spotlight-img qa-ref-top-recs__spotlight-img--empty" />
          )}
          <span className="qa-ref-top-recs__spotlight-verdict">{decision.verdict}</span>
        </div>
        <p className="qa-ref-top-recs__spotlight-kicker">{INTEL_TERMS.leadRecommendation}</p>
        <p className="qa-ref-top-recs__spotlight-price">{formatListingPrice(p.price, sym)}</p>
        <div className="qa-ref-top-recs__spotlight-seller">
          <span className="qa-ref-top-recs__seller-name line-clamp-1">{p.store}</span>
          <a
            href={p.offerOutboundUrl || p.link}
            target="_blank"
            rel="noopener noreferrer"
            className="qa-ref-top-recs__seller-link"
          >
            {INTEL_TERMS.openRetailSource}
            <ExternalLink className="size-3" aria-hidden />
          </a>
        </div>
        <p className="qa-ref-top-recs__spotlight-title line-clamp-2">{p.title}</p>
        <p className="qa-ref-top-recs__spotlight-reason">{decision.reason}</p>
        <div className="qa-ref-top-recs__spotlight-meta">
          <span>{Math.round(trust)}/100 {INTEL_TERMS.trustLayer.toLowerCase()}</span>
          <span>{decision.alignmentScore}% {INTEL_TERMS.decisionConfidence.toLowerCase()}</span>
        </div>
        <button type="button" onClick={() => onOpen(p)} className="qa-ref-top-recs__spotlight-cta">
          {INTEL_TERMS.openDecisionBrief}
        </button>
      </article>
    );
  }

  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`qa-ref-top-recs__card qa-ref-top-recs__card--${variant}`}
    >
      <div className={`qa-ref-top-recs__verdict qa-ref-top-recs__verdict--${verdictClass}`}>{decision.verdict}</div>
      <p className="qa-ref-top-recs__price">{formatListingPrice(p.price, sym)}</p>
      <div className="qa-ref-top-recs__seller">
        <span className="qa-ref-top-recs__seller-name line-clamp-1">{p.store}</span>
      </div>
      <p className="qa-ref-top-recs__title line-clamp-2">{p.title}</p>
      <button type="button" onClick={() => onOpen(p)} className="qa-ref-top-recs__cta">
        {INTEL_TERMS.openDecisionBrief}
      </button>
    </motion.article>
  );
}

function TierSection({
  title,
  picks,
  variant,
  onOpen,
}: {
  title: string;
  picks: EnrichedPick[];
  variant: "alt" | "watch" | "low";
  onOpen: (product: QuantProduct) => void;
}) {
  if (picks.length === 0) return null;

  return (
    <div className="qa-ref-top-recs__tier">
      <p className="qa-ref-top-recs__tier-kicker">{title}</p>
      <div className="qa-ref-top-recs__grid qa-ref-top-recs__grid--secondary">
        {picks.map((pick) => (
          <PickCard key={pick.product.link} pick={pick} variant={variant} onOpen={onOpen} />
        ))}
      </div>
    </div>
  );
}

export default function TopRecommendationsStrip({
  products,
  list,
  onOpen,
  onCompareTopTwo,
  showCompareCta = false,
}: Props) {
  const tiers = useMemo(() => {
    const enriched = enrich(products, list);
    const lead = enriched[0] ?? null;
    const rest = enriched.slice(1);

    const alternatives = rest
      .filter((row) => row.decision.verdict === "BUY READY" || row.decision.verdict === "COMPARE")
      .slice(0, 2);
    const watchlist = enriched
      .filter((row) => row.decision.verdict === "WAIT" && row.product.link !== lead?.product.link)
      .slice(0, 2);
    const lowConfidence = enriched
      .filter(
        (row) =>
          row.product.link !== lead?.product.link &&
          !alternatives.some((a) => a.product.link === row.product.link) &&
          !watchlist.some((w) => w.product.link === row.product.link) &&
          (row.decision.verdict === "AVOID" || row.decision.alignmentScore < 55)
      )
      .slice(0, 2);

    return { lead, alternatives, watchlist, lowConfidence };
  }, [products, list]);

  if (!tiers.lead) return null;

  return (
    <section className="qa-ref-top-recs" aria-label="Recommendation hierarchy">
      <div className="qa-ref-top-recs__head">
        <div>
          <p className="qa-ref-kicker">Recommendation hierarchy</p>
          <p className="qa-ref-top-recs__sub">Lead intelligence object and ranked market lanes.</p>
        </div>
        {showCompareCta && onCompareTopTwo ? (
          <button type="button" onClick={onCompareTopTwo} className="qa-ref-top-recs__compare">
            Compare top picks
          </button>
        ) : null}
      </div>

      <PickCard pick={tiers.lead} variant="lead" onOpen={onOpen} />

      <TierSection
        title={INTEL_TERMS.topAlternatives}
        picks={tiers.alternatives}
        variant="alt"
        onOpen={onOpen}
      />
      <TierSection
        title={INTEL_TERMS.marketWatchlist}
        picks={tiers.watchlist}
        variant="watch"
        onOpen={onOpen}
      />
      <TierSection
        title={INTEL_TERMS.lowConfidence}
        picks={tiers.lowConfidence}
        variant="low"
        onOpen={onOpen}
      />
    </section>
  );
}
