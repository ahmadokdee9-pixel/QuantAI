"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Check, ChevronDown, ExternalLink, ImageIcon, PanelRight, Sparkles, X } from "lucide-react";
import type { ProductDealIntelligence } from "@/lib/intelligence/dealIntelligenceEngine";
import type { DecisionBriefDTO } from "@/lib/intelligence/decisionBriefEngine";
import type { QuantProduct } from "@/lib/shoppingScore";
import { resolveActivatedBriefPresentation } from "@/lib/ui/activatedDecisionBriefPresentation";
import {
  optimizeVerdictSurface,
  type VerdictSurfaceContext,
} from "@/lib/ui/verdictSurfaceOptimization";
import { formatListingPrice } from "@/lib/commerce/cues";
import type { PrimaryVerdict } from "@/lib/ui/decisionLanguage";
import {
  buildBriefPreviewTags,
  buildExpandedSignalLines,
  buildIntelligenceChips,
  buildQuantAIVerdictNarrative,
  buildSmartDecisionLines,
  buildWhyQuantAIChoseThis,
} from "@/lib/ui/intelligenceCardSignals";
import { INTEL_TERMS, merchantActionLabel } from "@/lib/ui/intelligenceTerminology";
import { resolveProductImageDisplay } from "@/lib/ui/productImageQuality";

type Props = {
  product: QuantProduct;
  list: QuantProduct[];
  rank: number;
  sym: string;
  trust: number;
  trustMicro: string;
  deal: ProductDealIntelligence;
  verdictLabel: PrimaryVerdict;
  reasonLine: string;
  alignmentScore: number;
  inCompare: boolean;
  saved: boolean;
  compareDisabled: boolean;
  imagePriority?: "high" | "low";
  onOpenBrief: () => void;
  onToggleCompare: () => void;
  onSave: () => void;
  decisionBrief?: DecisionBriefDTO | null;
  verdictSurface?: VerdictSurfaceContext | null;
};

const SUMMARY_SLOTS = 2;

const cardIntelArgs = (p: QuantProduct, list: QuantProduct[], trust: number, deal: ProductDealIntelligence, verdictLabel: PrimaryVerdict, alignmentScore: number) => ({
  product: p,
  list,
  trustScore: trust,
  deal,
  verdict: verdictLabel,
  alignmentScore,
});

export default function IntelligenceCardBody({
  product: p,
  list,
  rank,
  sym,
  trust,
  trustMicro: _trustMicro,
  deal,
  verdictLabel,
  reasonLine,
  alignmentScore,
  inCompare,
  saved,
  compareDisabled,
  imagePriority = "low",
  onOpenBrief,
  onToggleCompare,
  onSave,
  decisionBrief = null,
  verdictSurface = null,
}: Props) {
  const [imageErr, setImageErr] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const verdictClass = verdictLabel.replace(/\s+/g, "-").toLowerCase();
  const image = resolveProductImageDisplay(p);
  const showAssetImage = image.showImage && image.src && !imageErr;

  const intelArgs = useMemo(
    () => cardIntelArgs(p, list, trust, deal, verdictLabel, alignmentScore),
    [p, list, trust, deal, verdictLabel, alignmentScore],
  );

  const briefTags = buildBriefPreviewTags({
    product: p,
    list,
    trustScore: trust,
    deal,
    reason: reasonLine,
    alignmentScore,
    rank,
  }).filter((t) => t.active);
  const activatedBrief = useMemo(
    () => resolveActivatedBriefPresentation(decisionBrief, verdictLabel),
    [decisionBrief, verdictLabel]
  );
  const optimizedSurface = useMemo(
    () =>
      optimizeVerdictSurface({
        verdict: verdictLabel,
        fallbackReason: reasonLine,
        decisionBrief,
        verdictIntelligence: verdictSurface?.verdictIntelligence ?? null,
        rankingEngine: verdictSurface?.rankingEngine ?? null,
        decisionReadiness: verdictSurface?.decisionReadiness ?? null,
        intentConfidence: verdictSurface?.intentConfidence ?? null,
        valueIntelligence: verdictSurface?.valueIntelligence ?? null,
      }),
    [verdictLabel, reasonLine, decisionBrief, verdictSurface]
  );
  const displayReasonLine = optimizedSurface.verdictReason || reasonLine;
  const whyChose = buildWhyQuantAIChoseThis(intelArgs);
  const intelChips = useMemo(() => buildIntelligenceChips(intelArgs), [intelArgs]);
  const expandedSignals = useMemo(() => {
    if (activatedBrief?.topSignals.length || activatedBrief?.riskSignals.length) {
      return [...activatedBrief.topSignals, ...activatedBrief.riskSignals].slice(0, 3);
    }
    return buildExpandedSignalLines(intelArgs);
  }, [activatedBrief, intelArgs]);
  const smartDecisions = useMemo(() => {
    const base = buildSmartDecisionLines(intelArgs);
    if (!activatedBrief) return base;
    const activated = [activatedBrief.reasoning, activatedBrief.marketStatus, activatedBrief.confidenceExplanation]
      .filter(Boolean)
      .concat(base);
    const seen = new Set<string>();
    return activated.filter((line) => {
      if (seen.has(line)) return false;
      seen.add(line);
      return true;
    }).slice(0, 3);
  }, [activatedBrief, intelArgs]);
  const quantVerdict = useMemo(() => buildQuantAIVerdictNarrative(intelArgs), [intelArgs]);

  const summaryReasons = useMemo(() => {
    const rows = optimizedSurface.summaryLines.slice(0, SUMMARY_SLOTS);
    while (rows.length < SUMMARY_SLOTS) rows.push("");
    return rows;
  }, [optimizedSurface.summaryLines]);

  const hasExpandedIntel =
    expandedSignals.length > 0 || smartDecisions.length > 0 || quantVerdict.length > 0;

  return (
    <div className="qa-ref-intel-card__shell">
      <div className="qa-ref-intel-card__asset">
        <div className={`qa-ref-intel-card__asset-frame qa-ref-intel-card__asset-frame--${image.mode}`}>
          <div className="qa-ref-intel-card__asset-glow" aria-hidden />
          <div className="qa-ref-intel-card__asset-glass" aria-hidden />
          {showAssetImage ? (
            <>
              {!imageLoaded ? <div className="qa-ref-intel-card__asset-shimmer" aria-hidden /> : null}
              <img
                src={image.src!}
                alt=""
                loading={imagePriority === "high" ? "eager" : "lazy"}
                decoding="async"
                fetchPriority={imagePriority}
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageErr(true)}
                className={`qa-ref-intel-card__asset-img ${imageLoaded ? "qa-ref-intel-card__asset-img--loaded" : ""}`}
              />
            </>
          ) : (
            <div className="qa-ref-intel-card__asset-placeholder" aria-hidden>
              <ImageIcon className="size-5 opacity-35" strokeWidth={1.25} />
            </div>
          )}
        </div>
        <p className="qa-ref-intel-card__asset-ref line-clamp-2">{p.title}</p>
      </div>

      <div
        className={`qa-ref-intel-card__verdict-band qa-ref-intel-card__verdict-band--${verdictClass}`}
        data-verdict={verdictLabel}
      >
        <span className="qa-ref-intel-card__verdict-kicker">Recommendation</span>
        <span className="qa-ref-intel-card__verdict-value">{verdictLabel}</span>
        <p className="qa-ref-intel-card__verdict-reason line-clamp-1">{displayReasonLine}</p>
      </div>

      <div className="qa-ref-intel-card__field qa-ref-intel-card__price-block">
        <span className="qa-ref-intel-card__field-label">{INTEL_TERMS.marketEntry}</span>
        <span className="qa-ref-intel-card__field-value">{formatListingPrice(p.price, sym)}</span>
      </div>

      <div className="qa-ref-intel-card__field qa-ref-intel-card__confidence-block">
        <span className="qa-ref-intel-card__field-label">{INTEL_TERMS.decisionConfidence}</span>
        <span className="qa-ref-intel-card__field-value">{Math.round(alignmentScore)}%</span>
        <div className="qa-ref-intel-card__confidence-bar" aria-hidden>
          <motion.span
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, Math.max(8, alignmentScore))}%` }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
      </div>

      <div className="qa-ref-intel-card__summary" aria-label="Intelligence summary">
        <ul className="qa-ref-intel-card__summary-list">
          {summaryReasons.map((reason, i) => (
            <li key={`${reason || "empty"}-${i}`} className={reason ? "" : "qa-ref-intel-card__summary-empty"}>
              {reason ? (
                <>
                  <Check className="size-3 shrink-0" aria-hidden />
                  <span className="line-clamp-1">{reason}</span>
                </>
              ) : (
                <span aria-hidden>&nbsp;</span>
              )}
            </li>
          ))}
        </ul>
        {intelChips.length > 0 ? (
          <div className="qa-ref-intel-card__signal-panel" aria-label="Smart signal panel">
            {intelChips.map((chip) => (
              <span
                key={chip.label}
                className={`qa-ref-intel-card__intel-chip qa-ref-intel-card__intel-chip--${chip.tone}`}
              >
                <Check className="size-2.5 shrink-0" aria-hidden />
                {chip.label}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <div className="qa-ref-intel-card__expand-row">
        <button
          type="button"
          className="qa-ref-intel-card__details-toggle"
          aria-expanded={detailsOpen}
          disabled={!hasExpandedIntel}
          onClick={() => hasExpandedIntel && setDetailsOpen((v) => !v)}
        >
          {detailsOpen ? "Close intelligence" : "Expand intelligence"}
          <ChevronDown className={`size-3.5 transition-transform ${detailsOpen ? "rotate-180" : ""}`} aria-hidden />
        </button>
      </div>

      <div className="qa-ref-intel-card__merchant">
        <a
          href={p.offerOutboundUrl || p.link}
          target="_blank"
          rel="noopener noreferrer"
          className="qa-ref-intel-card__merchant-action line-clamp-1"
        >
          {merchantActionLabel(p.store)}
          <ExternalLink className="size-3.5 shrink-0 opacity-70" aria-hidden />
        </a>
      </div>

      <div className="qa-ref-intel-card__footer">
        <motion.button
          type="button"
          onClick={onOpenBrief}
          whileTap={{ scale: 0.99 }}
          className="qa-ref-intel-card__cta"
        >
          <Sparkles className="size-3.5 opacity-90" strokeWidth={1.5} aria-hidden />
          {INTEL_TERMS.openDecisionBrief}
          <PanelRight className="size-3.5 opacity-75" strokeWidth={1.5} aria-hidden />
        </motion.button>

        <div className="qa-ref-intel-card__secondary" role="group" aria-label="Secondary actions">
          <motion.button
            type="button"
            onClick={onToggleCompare}
            disabled={compareDisabled}
            aria-pressed={inCompare}
            whileTap={{ scale: 0.985 }}
            className={`qa-ref-intel-card__secondary-btn ${inCompare ? "qa-ref-intel-card__secondary-btn--on" : ""}`}
          >
            Compare
          </motion.button>
          <motion.button
            type="button"
            onClick={onSave}
            disabled={saved}
            whileTap={{ scale: 0.985 }}
            className={`qa-ref-intel-card__secondary-btn ${saved ? "qa-ref-intel-card__secondary-btn--on" : ""}`}
          >
            {saved ? "Saved" : "Save"}
          </motion.button>
        </div>
      </div>

      {detailsOpen ? (
        <div className="qa-ref-intel-card__overlay" role="dialog" aria-label="Expanded intelligence">
          <div className="qa-ref-intel-card__overlay-head">
            <p className="qa-ref-intel-card__overlay-title">Expanded intelligence</p>
            <button type="button" className="qa-ref-intel-card__overlay-close" onClick={() => setDetailsOpen(false)}>
              <X className="size-3.5" aria-hidden />
              Close
            </button>
          </div>
          <div className="qa-ref-intel-card__overlay-body">
            <div className="qa-ref-intel-card__intel-module">
              <p className="qa-ref-intel-card__intel-module-kicker">Intelligence signals</p>
              <ul className="qa-ref-intel-card__intel-module-list qa-ref-intel-card__intel-module-list--signals">
                {expandedSignals.map((line) => (
                  <li key={line}>
                    <Check className="size-3 shrink-0" aria-hidden />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="qa-ref-intel-card__intel-module">
              <p className="qa-ref-intel-card__intel-module-kicker">Smart decisions</p>
              <ul className="qa-ref-intel-card__intel-module-list qa-ref-intel-card__intel-module-list--decisions">
                {smartDecisions.map((line) => (
                  <li key={line}>
                    <span className="qa-ref-intel-card__decision-dot" aria-hidden />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="qa-ref-intel-card__intel-module qa-ref-intel-card__intel-module--verdict">
              <p className="qa-ref-intel-card__intel-module-kicker">QuantAI verdict</p>
              <p className="qa-ref-intel-card__intel-module-verdict">{quantVerdict}</p>
            </div>

            {briefTags.length > 0 ? (
              <ul className="qa-ref-intel-card__brief-tags">
                {briefTags.map((tag) => (
                  <li key={tag.label}>{tag.label}</li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
