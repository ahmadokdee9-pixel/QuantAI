"use client";

/**
 * Additive Decision Analyst panels — reuse Instant Decision block language.
 * No redesign; explains every score with evidence.
 */

import type { AnalystDecisionBrief } from "@/lib/decisionAnalyst/types";

type Props = {
  analyst: AnalystDecisionBrief;
  compact?: boolean;
};

function ScoreRow({
  title,
  score,
  label,
  explanation,
}: {
  title: string;
  score: number | null;
  label: string;
  explanation: string;
}) {
  return (
    <div className="qa-instant-decision__signal">
      <dt>
        {title}
        {score != null ? ` · ${score}/100` : ""}
      </dt>
      <dd>
        <strong className="font-medium text-slate-200">{label}.</strong> {explanation}
      </dd>
    </div>
  );
}

export default function DecisionAnalystPanels({ analyst, compact = false }: Props) {
  const thesis = analyst.thesis;
  const scores = [
    { title: "Opportunity", s: analyst.opportunity },
    { title: "Risk", s: analyst.risk },
    { title: "Regret (buy today)", s: analyst.regret },
    { title: "Waiting value", s: analyst.waiting },
    { title: "Better alternative odds", s: analyst.betterAlternativeProbability },
    { title: "Recommendation stability", s: analyst.recommendationStability },
  ];

  return (
    <>
      {thesis ? (
        <section className="qa-instant-decision__block qa-instant-decision__block--full">
          <h3 className="qa-instant-decision__block-title">Decision thesis</h3>
          <p className="qa-instant-decision__wait-headline">{thesis.coreThesis}</p>
          <p className="qa-instant-decision__horizon-note mt-2">{thesis.confidenceExplanation}</p>
          <p className="qa-instant-decision__horizon-note mt-2">
            <span className="text-slate-400">Counter-thesis:</span> {thesis.counterThesis}
          </p>
          <p className="qa-instant-decision__horizon-note mt-2">
            <span className="text-slate-400">Next expected event:</span> {thesis.nextExpectedEvent}
          </p>

          {!compact ? (
            <div className="qa-instant-decision__grid mt-3">
              <div>
                <h4 className="qa-instant-decision__block-title">Supporting evidence</h4>
                <ul className="qa-instant-decision__list">
                  {thesis.supportingEvidence.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="qa-instant-decision__block-title">Missing evidence</h4>
                <ul className="qa-instant-decision__list qa-instant-decision__list--risk">
                  {thesis.missingEvidence.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="qa-instant-decision__block-title">Confirmation signals</h4>
                <ul className="qa-instant-decision__list">
                  {thesis.confirmationSignals.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="qa-instant-decision__block-title">Invalidation signals</h4>
                <ul className="qa-instant-decision__list qa-instant-decision__list--risk">
                  {thesis.invalidationSignals.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="qa-instant-decision__block-title">Critical assumptions</h4>
                <ul className="qa-instant-decision__list">
                  {thesis.criticalAssumptions.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="qa-instant-decision__block-title">Failure scenarios</h4>
                <ul className="qa-instant-decision__list qa-instant-decision__list--risk">
                  {thesis.failureScenarios.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="qa-instant-decision__block qa-instant-decision__block--full">
        <h3 className="qa-instant-decision__block-title">Analyst scores</h3>
        <dl className="qa-instant-decision__signals">
          {scores.map(({ title, s }) => (
            <ScoreRow
              key={title}
              title={title}
              score={s.score}
              label={s.label}
              explanation={s.explanation}
            />
          ))}
          <div className="qa-instant-decision__signal">
            <dt>Confidence trend · {analyst.confidenceTrend.trend}</dt>
            <dd>{analyst.confidenceTrend.explanation}</dd>
          </div>
          <div className="qa-instant-decision__signal">
            <dt>
              Expected price · {analyst.expectedPriceMovement.direction} ·{" "}
              {analyst.expectedPriceMovement.magnitudeLabel}
            </dt>
            <dd>{analyst.expectedPriceMovement.explanation}</dd>
          </div>
        </dl>
      </section>

      <section className="qa-instant-decision__block qa-instant-decision__block--full">
        <h3 className="qa-instant-decision__block-title">Change probability</h3>
        <div className="qa-instant-decision__timeline">
          {analyst.changeProbabilities.map((h) => (
            <div
              key={h.horizon}
              className="qa-instant-decision__horizon qa-instant-decision__horizon--reassess"
            >
              <span className="qa-instant-decision__horizon-when">{h.horizon}</span>
              <span className="qa-instant-decision__horizon-stance">
                {h.probabilityPct != null ? `${h.probabilityPct}%` : "n/a"}
              </span>
              <span className="qa-instant-decision__horizon-note">{h.explanation}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="qa-instant-decision__grid">
        <section className="qa-instant-decision__block">
          <h3 className="qa-instant-decision__block-title">Best buying window</h3>
          <p className="qa-instant-decision__wait-headline">{analyst.bestBuyingWindow.label}</p>
          <p className="qa-instant-decision__horizon-note">{analyst.bestBuyingWindow.explanation}</p>
        </section>
        <section className="qa-instant-decision__block">
          <h3 className="qa-instant-decision__block-title">Worst buying window</h3>
          <p className="qa-instant-decision__wait-headline">{analyst.worstBuyingWindow.label}</p>
          <p className="qa-instant-decision__horizon-note">{analyst.worstBuyingWindow.explanation}</p>
        </section>
      </div>

      <section className="qa-instant-decision__block qa-instant-decision__block--full">
        <h3 className="qa-instant-decision__block-title">Intelligence timeline</h3>
        <div className="qa-instant-decision__timeline">
          {analyst.intelligenceTimeline.map((slot) => (
            <div
              key={slot.phase}
              className={`qa-instant-decision__horizon ${
                slot.phase === "Now"
                  ? "qa-instant-decision__horizon--act"
                  : slot.phase === "Past"
                    ? "qa-instant-decision__horizon--hold"
                    : "qa-instant-decision__horizon--reassess"
              }`}
            >
              <span className="qa-instant-decision__horizon-when">{slot.phase}</span>
              <span className="qa-instant-decision__horizon-stance">{slot.headline}</span>
              <span className="qa-instant-decision__horizon-note">{slot.detail}</span>
            </div>
          ))}
        </div>
      </section>

      {!compact ? (
        <>
          <div className="qa-instant-decision__grid">
            <section className="qa-instant-decision__block">
              <h3 className="qa-instant-decision__block-title">Assumptions</h3>
              <ul className="qa-instant-decision__list">
                {analyst.assumptions.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </section>
            <section className="qa-instant-decision__block">
              <h3 className="qa-instant-decision__block-title">What could invalidate</h3>
              <ul className="qa-instant-decision__list qa-instant-decision__list--risk">
                {analyst.invalidators.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </section>
          </div>

          <section className="qa-instant-decision__block qa-instant-decision__block--full">
            <h3 className="qa-instant-decision__block-title">Watch these events</h3>
            <ul className="qa-instant-decision__list">
              {analyst.watchEvents.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </section>
        </>
      ) : null}

      {analyst.signals.length > 0 ? (
        <section className="qa-instant-decision__block qa-instant-decision__block--full">
          <h3 className="qa-instant-decision__block-title">Decision signals</h3>
          <dl className="qa-instant-decision__signals">
            {analyst.signals.map((sig) => (
              <div key={sig.id} className="qa-instant-decision__signal">
                <dt>
                  {sig.name}
                  {sig.intensity != null ? ` · ${sig.intensity}` : ""} · {sig.state}
                </dt>
                <dd>{sig.explanation}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}
    </>
  );
}
