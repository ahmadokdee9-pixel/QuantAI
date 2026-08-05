"use client";

/**
 * Universal Instant Decision surface — reuses Instant Decision visual language
 * without modifying InstantDecisionCard. Used for non-product domains.
 */

import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Bell, Check, ChevronDown, ExternalLink, Shield } from "lucide-react";
import { buildUniversalAnalystBrief } from "@/lib/decisionAnalyst";
import { buildDecisionConsensus } from "@/lib/decisionConsensus";
import { buildDecisionNarrative } from "@/lib/decisionNarrative";
import { buildLocalLivingPresence } from "@/lib/decisionMemory/livingPresence";
import { listLocalMissionsDashboard } from "@/lib/missions/clientMissions";
import type { UniversalDecision } from "@/lib/universalDecision/types";
import { actionCommitmentLabel } from "@/lib/universalDecision/actions";
import DomainEvidenceModules from "@/components/search/DomainEvidenceModules";
import type { LivingDecisionThread } from "@/lib/livingDecision/types";
import DecisionHistorySection from "@/components/decisionMemory/DecisionHistorySection";
import WhatsChangedBadges from "@/components/decisionMemory/WhatsChangedBadges";
import DecisionAnalystPanels from "@/components/search/DecisionAnalystPanels";
import DecisionConsensusPanel from "@/components/search/DecisionConsensusPanel";
import DecisionNarrativePanel from "@/components/search/DecisionNarrativePanel";
import EnginePresenceLine from "@/components/search/EnginePresenceLine";
import { thesisContinuityHeadline } from "@/lib/decisionThesis/snapshot";

type Props = {
  decision: UniversalDecision;
  watching?: boolean;
  onWatch?: () => void;
  compact?: boolean;
  livingThread?: LivingDecisionThread | null;
};

const ACTIONS = ["BUY", "WAIT", "COMPARE", "AVOID"] as const;

function verdictModifier(action: UniversalDecision["action"]): string {
  if (action === "BUY") return "buy-ready";
  if (action === "WAIT" || action === "AVOID") return "wait";
  return "compare";
}

export default function UniversalDecisionCard({
  decision,
  watching = false,
  onWatch,
  compact = false,
  livingThread = null,
}: Props) {
  const reduceMotion = useReducedMotion();
  const [transparencyOpen, setTransparencyOpen] = useState(false);
  const [watchFlash, setWatchFlash] = useState(false);
  const modifier = verdictModifier(decision.action);
  const leader = decision.leader;

  const analyst = useMemo(() => {
    if (livingThread) {
      return buildUniversalAnalystBrief({ decision, livingThread });
    }
    return decision.analyst ?? buildUniversalAnalystBrief({ decision });
  }, [decision, livingThread]);

  const { consensus, narrative } = useMemo(() => {
    let presence = null;
    let missionPendingCritical: number | null = null;
    let missionLinked: boolean | null = null;
    try {
      if (typeof window !== "undefined") {
        presence = buildLocalLivingPresence();
        const dash = listLocalMissionsDashboard();
        missionPendingCritical = dash.totals.criticalChanges;
        const link = decision.leader?.link || null;
        const q = (decision.leader?.title || decision.query || "").toLowerCase();
        missionLinked = dash.missions.some((m) =>
          m.decisions.some(
            (d) =>
              (d.productLink && link && d.productLink === link) ||
              (d.searchQuery &&
                q &&
                (d.searchQuery.toLowerCase().includes(q.slice(0, 18)) ||
                  q.includes(d.searchQuery.toLowerCase().slice(0, 18))))
          )
        );
        if (dash.totals.activeMissions === 0) {
          missionLinked = null;
          missionPendingCritical = null;
        }
      }
    } catch {
      presence = null;
    }
    const nextConsensus = buildDecisionConsensus({
      action: decision.action,
      confidence: decision.confidence,
      analyst,
      livingThread,
      presence,
      missionPendingCritical,
      missionLinked,
    });
    const nextNarrative = buildDecisionNarrative({
      action: decision.action,
      confidence: decision.confidence,
      analyst,
      consensus: nextConsensus,
      livingThread,
      presence,
      missionLinked,
      missionPendingCritical,
      productTitle: decision.leader?.title || decision.query,
    });
    return { consensus: nextConsensus, narrative: nextNarrative };
  }, [decision, analyst, livingThread]);

  const executiveSummary = analyst.executiveDecisionSummary || decision.executiveSummary;

  function handleWatch() {
    if (!onWatch) return;
    onWatch();
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
        reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 280, damping: 36, mass: 0.85 }
      }
    >
      <header className="qa-instant-decision__header">
        <p className="qa-ref-exec-brief__kicker">Instant Decision</p>
        <p className="qa-instant-decision__question">What should I do?</p>
        {livingThread?.recentChanges?.length ? (
          <WhatsChangedBadges changes={livingThread.recentChanges} />
        ) : null}
        <EnginePresenceLine
          livingThread={livingThread}
          freshness={decision.sourceFreshness}
          confidence={decision.confidence}
          analyst={analyst}
          consensus={consensus}
        />
      </header>

      <div className={`qa-ref-exec-brief__verdict qa-ref-exec-brief__verdict--${modifier}`}>
        <span className="qa-ref-exec-brief__verdict-beam" aria-hidden />
        <div className="qa-instant-decision__action-row" aria-label="Decision actions">
          {ACTIONS.map((a) => (
            <span
              key={a}
              className={`qa-instant-decision__action${a === decision.action ? " qa-instant-decision__action--active" : ""}`}
            >
              {a === decision.action
                ? actionCommitmentLabel(decision.domain, decision.action)
                : a}
            </span>
          ))}
        </div>
        <div className="qa-instant-decision__confidence-row">
          <div className="qa-instant-decision__confidence-meta">
            <span className="qa-instant-decision__confidence-label">Confidence</span>
            <span className="qa-instant-decision__confidence-value">{decision.confidence}%</span>
          </div>
          <div className="qa-instant-decision__confidence-track" aria-hidden>
            <span style={{ width: `${decision.confidence}%` }} />
          </div>
        </div>
        {decision.contextualVerb !== decision.action ? (
          <p className="qa-instant-decision__action-detail">
            Commitment sense: {decision.contextualVerb}
          </p>
        ) : null}
      </div>

      <p className="qa-instant-decision__summary">{executiveSummary}</p>
      {(() => {
        const continuity = livingThread?.recentChanges?.length
          ? thesisContinuityHeadline(livingThread.recentChanges)
          : null;
        if (continuity) {
          return (
            <p className="qa-instant-decision__horizon-note qa-instant-decision__horizon-note--live mt-2">{continuity}</p>
          );
        }
        if (analyst.thesis?.nextExpectedEvent) {
          return (
            <p className="qa-instant-decision__horizon-note mt-2">
              Watching · {analyst.thesis.nextExpectedEvent}
            </p>
          );
        }
        return null;
      })()}

      {leader ? (
        <div className="qa-instant-decision__product">
          <div className="qa-instant-decision__product-img qa-instant-decision__product-img--empty" />
          <div>
            <p className="qa-instant-decision__product-title">{leader.title}</p>
            <p className="qa-instant-decision__product-meta">
              {[leader.merchant, leader.subtitle, leader.price != null ? `${leader.currency || ""} ${leader.price}` : null]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
        </div>
      ) : null}

      <DecisionNarrativePanel narrative={narrative} compact={compact} />

      <DecisionConsensusPanel consensus={consensus} compact={compact} />

      <div className="qa-instant-decision__grid">
        <div className="qa-instant-decision__block">
          <h3 className="qa-instant-decision__block-title">Why</h3>
          <ul className="qa-instant-decision__list">
            {decision.reasons.slice(0, 4).map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>
        <div className="qa-instant-decision__block">
          <h3 className="qa-instant-decision__block-title">Risks</h3>
          <ul className="qa-instant-decision__list qa-instant-decision__list--risk">
            {decision.risks.slice(0, 4).map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>
        {decision.alternatives.length > 0 ? (
          <div className="qa-instant-decision__block qa-instant-decision__block--full">
            <h3 className="qa-instant-decision__block-title">Alternatives</h3>
            <div className="qa-instant-decision__alts">
              {decision.alternatives.map((alt) => (
                <a
                  key={alt.id}
                  className="qa-instant-decision__alt"
                  href={alt.link || "#"}
                  target={alt.link ? "_blank" : undefined}
                  rel={alt.link ? "noopener noreferrer" : undefined}
                  onClick={(e) => {
                    if (!alt.link) e.preventDefault();
                  }}
                >
                  <span className="qa-instant-decision__alt-title">{alt.title}</span>
                  <span className="qa-instant-decision__alt-meta">
                    {alt.price != null ? `${alt.currency || ""} ${alt.price}` : alt.subtitle || ""}
                  </span>
                  <span className="qa-instant-decision__alt-why">{alt.why}</span>
                </a>
              ))}
            </div>
          </div>
        ) : null}
        <div className="qa-instant-decision__block qa-instant-decision__block--full">
          <h3 className="qa-instant-decision__block-title">Timing</h3>
          <div className="qa-instant-decision__timeline">
            <div className="qa-instant-decision__horizon qa-instant-decision__horizon--act">
              <span>Today</span>
              <p>{decision.timing.today}</p>
            </div>
            <div className="qa-instant-decision__horizon qa-instant-decision__horizon--hold">
              <span>This Week</span>
              <p>{decision.timing.thisWeek}</p>
            </div>
            <div className="qa-instant-decision__horizon qa-instant-decision__horizon--reassess">
              <span>This Month</span>
              <p>{decision.timing.thisMonth}</p>
            </div>
          </div>
        </div>
      </div>

      <DomainEvidenceModules
        domain={decision.domain}
        evidence={decision.evidence}
        freshness={decision.sourceFreshness}
        insufficientEvidence={decision.insufficientEvidence}
      />

      <DecisionAnalystPanels analyst={analyst} compact={compact} />

      <DecisionHistorySection thread={livingThread} compact={compact} />

      <div className="qa-instant-decision__actions">
        {leader?.link ? (
          <a
            href={leader.link}
            target="_blank"
            rel="noopener noreferrer"
            className="qa-ui-btn-primary qa-instant-decision__cta"
          >
            Inspect option
            <ExternalLink className="size-3.5 opacity-80" strokeWidth={1.75} aria-hidden />
          </a>
        ) : null}
        {decision.watchable && onWatch ? (
          <button
            type="button"
            className="qa-ui-btn-secondary qa-instant-decision__cta qa-instant-decision__cta--watch"
            onClick={handleWatch}
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
      </div>

      <div className="qa-instant-decision__transparency">
        <button
          type="button"
          className="qa-instant-decision__transparency-toggle"
          onClick={() => setTransparencyOpen((v) => !v)}
          aria-expanded={transparencyOpen}
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
              className="qa-instant-decision__transparency-body"
              initial={reduceMotion ? false : { height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={reduceMotion ? undefined : { height: 0, opacity: 0 }}
            >
              <p className="qa-instant-decision__transparency-lead">
                Domain confidence {decision.domainConfidence}% · Trust: {decision.trust.label}
                {decision.trust.score != null ? ` (${decision.trust.score})` : ""}. Facts vs
                inference are labeled; confidence is capped by verified facts, not text volume.
              </p>
              <ul className="qa-instant-decision__systems">
                {[...decision.trust.notes, ...analyst.evidenceSystems].map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </motion.section>
  );
}
