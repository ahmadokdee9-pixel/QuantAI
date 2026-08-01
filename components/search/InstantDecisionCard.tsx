"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Bell,
  Check,
  ChevronDown,
  ExternalLink,
  Shield,
} from "lucide-react";
import type { DecisionBriefDTO } from "@/lib/intelligence/decisionBriefEngine";
import { resolveOfferClickUrl } from "@/lib/commerce/offerClick";
import type { QuantProduct } from "@/lib/shoppingScore";
import {
  buildInstantDecisionViewModel,
  type ExecutiveDecisionAction,
  type InstantDecisionViewModel,
} from "@/lib/ui/instantDecisionModel";
import type { UniversalProductDecision } from "@/lib/ui/universalProductDecision";

type Props = {
  leader: QuantProduct | null;
  tray: QuantProduct[];
  universal: UniversalProductDecision | null;
  universalByLink: Map<string, UniversalProductDecision>;
  decisionBrief: DecisionBriefDTO | null;
  addToWatchlist?: (product: QuantProduct) => void;
  onPrimeCompare?: (links: string[]) => void;
  onOpenProduct?: (product: QuantProduct) => void;
  watching?: boolean;
  /** Compact layout for intelligence drawer. */
  compact?: boolean;
};

const ACTIONS: ExecutiveDecisionAction[] = ["BUY", "WAIT", "COMPARE", "AVOID"];

function verdictModifier(action: ExecutiveDecisionAction): string {
  switch (action) {
    case "BUY":
      return "buy-ready";
    case "WAIT":
      return "wait";
    case "AVOID":
      return "wait";
    default:
      return "compare";
  }
}

function stanceClass(stance: InstantDecisionViewModel["timeline"][number]["stance"]): string {
  switch (stance) {
    case "Act":
      return "qa-instant-decision__horizon--act";
    case "Hold":
      return "qa-instant-decision__horizon--hold";
    case "Avoid":
      return "qa-instant-decision__horizon--avoid";
    default:
      return "qa-instant-decision__horizon--reassess";
  }
}

export default function InstantDecisionCard({
  leader,
  tray,
  universal,
  universalByLink,
  decisionBrief,
  addToWatchlist,
  onPrimeCompare,
  onOpenProduct,
  watching = false,
  compact = false,
}: Props) {
  const reduceMotion = useReducedMotion();
  const [transparencyOpen, setTransparencyOpen] = useState(false);
  const [watchFlash, setWatchFlash] = useState(false);

  const model = useMemo(
    () =>
      buildInstantDecisionViewModel({
        leader,
        tray,
        universal,
        brief: decisionBrief,
        universalByLink,
      }),
    [leader, tray, universal, decisionBrief, universalByLink]
  );

  if (!model || !leader) return null;

  const modifier = verdictModifier(model.action);
  const offerUrl = resolveOfferClickUrl(leader);

  function handleWatch() {
    if (!addToWatchlist || !leader) return;
    addToWatchlist(leader);
    setWatchFlash(true);
    window.setTimeout(() => setWatchFlash(false), 1800);
  }

  return (
    <motion.section
      className={`qa-ref-exec-brief qa-instant-decision qa-instant-decision--${modifier}${compact ? " qa-instant-decision--compact" : ""}`}
      aria-label="Instant decision"
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={
        reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 320, damping: 34 }
      }
    >
      <header className="qa-instant-decision__header">
        <p className="qa-ref-exec-brief__kicker">Instant Decision</p>
        <p className="qa-instant-decision__question">What should I do?</p>
      </header>

      <div className={`qa-ref-exec-brief__verdict qa-ref-exec-brief__verdict--${modifier}`}>
        <span className="qa-ref-exec-brief__verdict-beam" aria-hidden />
        <span className="qa-ref-exec-brief__verdict-glow" aria-hidden />

        <div className="qa-instant-decision__action-row" role="list" aria-label="Executive decision">
          {ACTIONS.map((action) => {
            const active = action === model.action;
            return (
              <span
                key={action}
                role="listitem"
                className={`qa-instant-decision__action ${active ? "qa-instant-decision__action--active" : ""}`}
                aria-current={active ? "true" : undefined}
              >
                {action}
              </span>
            );
          })}
        </div>

        <div className="qa-instant-decision__confidence-row">
          <div className="qa-instant-decision__confidence-meta">
            <span className="qa-instant-decision__confidence-label">Confidence</span>
            <span className="qa-instant-decision__confidence-value">{model.confidence}%</span>
          </div>
          <div
            className="qa-ui-confidence-band qa-instant-decision__confidence-track"
            role="meter"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={model.confidence}
            aria-label="Decision confidence"
          >
            <span
              className="qa-ui-confidence-fill"
              style={{ width: `${model.confidence}%` }}
            />
          </div>
          {model.actionDetail ? (
            <p className="qa-instant-decision__action-detail">{model.actionDetail}</p>
          ) : null}
        </div>

        <p className="qa-ref-exec-brief__synthesis qa-instant-decision__summary">
          {model.executiveSummary}
        </p>

        <div className="qa-instant-decision__product">
          {model.product.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={model.product.image}
              alt=""
              className="qa-instant-decision__product-img"
            />
          ) : (
            <div className="qa-instant-decision__product-img qa-instant-decision__product-img--empty" />
          )}
          <div className="qa-instant-decision__product-copy">
            <p className="qa-instant-decision__product-title">{model.product.title}</p>
            <p className="qa-instant-decision__product-meta">
              {model.product.store}
              {model.product.price != null ? ` · €${Math.round(model.product.price)}` : ""}
            </p>
          </div>
        </div>
      </div>

      <div className="qa-instant-decision__grid">
        <section className="qa-instant-decision__block">
          <h3 className="qa-instant-decision__block-title">Top reasons</h3>
          <ul className="qa-instant-decision__list">
            {model.topReasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </section>

        <section className="qa-instant-decision__block">
          <h3 className="qa-instant-decision__block-title">Risks</h3>
          <ul className="qa-instant-decision__list qa-instant-decision__list--risk">
            {model.risks.map((risk) => (
              <li key={risk}>{risk}</li>
            ))}
          </ul>
        </section>
      </div>

      {model.betterAlternatives.length > 0 && model.action !== "BUY" ? (
        <section className="qa-instant-decision__block qa-instant-decision__block--full">
          <h3 className="qa-instant-decision__block-title">
            {model.action === "COMPARE" ? "Compare these" : "Stronger options"}
          </h3>
          <div className="qa-instant-decision__alts">
            {model.betterAlternatives.map((alt) => {
              const product = tray.find((p) => p.link === alt.link);
              return (
                <button
                  key={alt.link}
                  type="button"
                  className="qa-instant-decision__alt"
                  onClick={() => {
                    if (product && onOpenProduct) onOpenProduct(product);
                    else if (leader) onPrimeCompare?.([leader.link, alt.link]);
                  }}
                >
                  <span className="qa-instant-decision__alt-title">{alt.title}</span>
                  <span className="qa-instant-decision__alt-meta">
                    {alt.store}
                    {alt.price != null ? ` · €${Math.round(alt.price)}` : ""}
                  </span>
                  <span className="qa-instant-decision__alt-why">{alt.why}</span>
                </button>
              );
            })}
          </div>
        </section>
      ) : null}

      {model.waitIntelligence.relevant ? (
        <section className="qa-instant-decision__block qa-instant-decision__block--full qa-instant-decision__wait">
          <h3 className="qa-instant-decision__block-title">Wait intelligence</h3>
          <p className="qa-instant-decision__wait-headline">{model.waitIntelligence.headline}</p>
          {model.waitIntelligence.points.length > 0 ? (
            <ul className="qa-instant-decision__list">
              {model.waitIntelligence.points.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}

      <section className="qa-instant-decision__block qa-instant-decision__block--full">
        <h3 className="qa-instant-decision__block-title">Decision timeline</h3>
        <div className="qa-instant-decision__timeline">
          {model.timeline.map((slot) => (
            <div
              key={slot.horizon}
              className={`qa-instant-decision__horizon ${stanceClass(slot.stance)}`}
            >
              <span className="qa-instant-decision__horizon-when">{slot.horizon}</span>
              <span className="qa-instant-decision__horizon-stance">{slot.stance}</span>
              <span className="qa-instant-decision__horizon-note">{slot.note}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="qa-instant-decision__actions">
        {model.action === "BUY" || model.action === "COMPARE" ? (
          <a
            href={offerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="qa-ui-btn-primary qa-instant-decision__cta"
          >
            {model.action === "BUY" ? "Review & buy" : "Inspect listing"}
            <ExternalLink className="size-3.5 opacity-80" strokeWidth={1.75} aria-hidden />
          </a>
        ) : null}

        {addToWatchlist ? (
          <button
            type="button"
            onClick={handleWatch}
            className="qa-ui-btn-secondary qa-instant-decision__cta qa-instant-decision__cta--watch"
            disabled={watching && !watchFlash}
          >
            {watching || watchFlash ? (
              <>
                <Check className="size-3.5" strokeWidth={2} aria-hidden />
                Watching decision
              </>
            ) : (
              <>
                <Bell className="size-3.5" strokeWidth={1.75} aria-hidden />
                Watch decision
              </>
            )}
          </button>
        ) : null}

        {model.action === "COMPARE" && model.betterAlternatives[0] && onPrimeCompare ? (
          <button
            type="button"
            className="qa-ui-btn-ghost qa-instant-decision__cta"
            onClick={() =>
              onPrimeCompare([leader.link, model.betterAlternatives[0]!.link])
            }
          >
            Compare top options
          </button>
        ) : null}
      </div>

      <div className="qa-instant-decision__transparency">
        <button
          type="button"
          className="qa-instant-decision__transparency-toggle"
          aria-expanded={transparencyOpen}
          onClick={() => setTransparencyOpen((v) => !v)}
        >
          <Shield className="size-3.5 opacity-70" strokeWidth={1.75} aria-hidden />
          Decision transparency
          <ChevronDown
            className={`size-3.5 opacity-60 transition-transform ${transparencyOpen ? "rotate-180" : ""}`}
            strokeWidth={1.75}
            aria-hidden
          />
        </button>

        <AnimatePresence initial={false}>
          {transparencyOpen ? (
            <motion.div
              key="transparency"
              initial={reduceMotion ? false : { height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={reduceMotion ? undefined : { height: 0, opacity: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.22 }}
              className="qa-instant-decision__transparency-body"
            >
              <p className="qa-instant-decision__transparency-lead">
                This verdict is produced by QuantAI&apos;s Decision Engine — not a black-box chat reply.
              </p>
              <ul className="qa-instant-decision__systems">
                {model.systemsInvolved.map((system) => (
                  <li key={system}>{system}</li>
                ))}
              </ul>
              <dl className="qa-instant-decision__signals">
                {model.transparency.map((signal) => (
                  <div key={signal.label} className="qa-instant-decision__signal">
                    <dt>{signal.label}</dt>
                    <dd>{signal.value}</dd>
                  </div>
                ))}
              </dl>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </motion.section>
  );
}
