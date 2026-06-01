"use client";

import type { ReactNode } from "react";
import { useEffect, useId, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ExternalLink, Store, X } from "lucide-react";
import {
  decisionBand,
  listAveragePrice,
  pickSimilarAlternatives,
  priceTrendInsightParagraph,
  quantVerdictLead,
  trustAnalysisParagraph,
  valueAnalysisParagraph,
} from "@/lib/intelligence/drawerInsights";
import { resolveOfferClickUrl } from "@/lib/commerce/offerClick";
import {
  getFinalComposite,
  getProsAndCons,
  getStoreTrustScore,
  getWhyQuantAIRecommends,
  type QuantProduct,
} from "@/lib/shoppingScore";
import { intelligenceDecisionLabel } from "@/lib/ui/intelligencePresentation";

type Props = {
  product: QuantProduct | null;
  list: QuantProduct[];
  open: boolean;
  onClose: () => void;
  onSave?: (p: QuantProduct) => void;
  saved?: boolean;
};

function SignalBar({ value }: { value: number }) {
  const v = Math.min(100, Math.max(0, value));
  const reduceMotion = useReducedMotion();
  return (
    <div className="qa-ui-confidence-band h-2 w-full overflow-hidden rounded-full">
      <motion.div
        className="qa-ui-confidence-fill h-full rounded-full"
        initial={false}
        animate={{ width: `${v}%` }}
        transition={
          reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 300, damping: 30 }
        }
      />
    </div>
  );
}

function DrawerModule({
  title,
  children,
  className = "",
  act = "primary",
  defaultOpen = true,
}: {
  title: string;
  children: ReactNode;
  className?: string;
  act?: "primary" | "fold";
  defaultOpen?: boolean;
}) {
  if (act === "primary") {
    return (
      <section className={`qa-cine-drawer-act qa-cine-drawer-act--primary qa-ui-drawer-module ${className}`}>
        <h3 className="qa-ui-drawer-module-title">{title}</h3>
        <div className="qa-ui-drawer-module-body">{children}</div>
      </section>
    );
  }
  return (
    <details className={`qa-cine-drawer-act qa-cine-drawer-act--fold qa-ui-drawer-module ${className}`} open={defaultOpen}>
      <summary className="qa-cine-drawer-fold-trigger">
        <span className="qa-ui-drawer-module-title">{title}</span>
      </summary>
      <div className="qa-ui-drawer-module-body qa-cine-drawer-fold-body">{children}</div>
    </details>
  );
}

export default function ProductIntelligenceDrawer({
  product: p,
  list,
  open,
  onClose,
  onSave,
  saved = false,
}: Props) {
  const reduceMotion = useReducedMotion();
  const titleId = useId();
  const [mounted, setMounted] = useState(false);
  const [panelEdge, setPanelEdge] = useState<"bottom" | "right">("bottom");

  useEffect(() => {
    queueMicrotask(() => setMounted(true));
  }, []);

  useLayoutEffect(() => {
    const mq = window.matchMedia("(min-width: 640px)");
    const apply = () => setPanelEdge(mq.matches ? "right" : "bottom");
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!mounted || typeof document === "undefined") return null;

  const slideInitial =
    reduceMotion || !p
      ? false
      : panelEdge === "bottom"
        ? { y: "100%", opacity: 0.96 }
        : { x: "100%", opacity: 0.96 };
  const slideExit =
    reduceMotion || !p
      ? undefined
      : panelEdge === "bottom"
        ? { y: "100%", opacity: 0.9 }
        : { x: "100%", opacity: 0.9 };

  const panel = (
    <AnimatePresence>
      {open && p && (
        <motion.div
          key="intel-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className="fixed inset-0 z-[60] flex items-end justify-center sm:items-stretch sm:justify-end"
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduceMotion ? undefined : { opacity: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.22 }}
        >
          <button
            type="button"
            tabIndex={-1}
            className="qa-ui-overlay-scrim absolute inset-0 z-0"
            aria-label="Close intelligence panel"
            onClick={onClose}
          />

          <motion.aside
            initial={slideInitial}
            animate={{ y: 0, x: 0, opacity: 1 }}
            exit={slideExit}
            transition={
              reduceMotion
                ? { duration: 0 }
                : { type: "spring", stiffness: 420, damping: 38, mass: 0.85 }
            }
            className="qa-ui-analyst-shell qa-ui-intel-drawer qa-ui-intel-drawer--light qa-os-drawer qa-modal-panel relative z-[2] flex max-h-[min(92dvh,920px)] w-full max-w-lg flex-col overflow-hidden rounded-t-[1.75rem] border-b-0 sm:max-h-none sm:h-full sm:max-w-[min(100vw,26rem)] sm:rounded-none sm:border-l sm:border-t-0 sm:border-r-0 sm:border-b-0 lg:max-w-[min(100vw,34rem)]"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="qa-ui-drawer-header relative flex shrink-0 items-start gap-3 border-b px-4 pb-4 pt-4 sm:px-5 sm:pt-5">
              <div className="min-w-0 flex-1">
                <p className="qa-ui-type-label text-[10px] text-slate-400">
                  Intelligence deck
                </p>
                <h2 id={titleId} className="qa-ui-drawer-title line-clamp-2">
                  {p.title}
                </h2>
                <p className="qa-ui-drawer-meta">
                  <span className="inline-flex items-center gap-1">
                    <Store className="size-3.5 opacity-70" strokeWidth={1.5} aria-hidden />
                    {p.store}
                  </span>
                  <span className="inline-flex items-center gap-1 tabular-nums">
                    <span className="qa-ui-drawer-price">€{p.price}</span>
                    {p.oldPrice != null && p.oldPrice > p.price && (
                      <span className="qa-ui-drawer-price-strike">€{p.oldPrice}</span>
                    )}
                  </span>
                </p>
              </div>
              {p.image ? (
                <div className="qa-ui-drawer-media shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.image} alt="" className="qa-ui-drawer-media-img" />
                </div>
              ) : null}
              <button
                type="button"
                onClick={onClose}
                className="qa-ui-btn-ghost absolute right-3 top-3 !min-h-0 rounded-full p-2 sm:right-4 sm:top-4"
                aria-label="Close"
              >
                <X className="size-4" strokeWidth={1.5} />
              </button>
            </header>

            <div className="qa-ui-drawer-body qa-cine-drawer-body relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-4 py-4 sm:px-5 sm:py-5">
              <DrawerBody p={p} list={list} />
            </div>

            <footer className="qa-ui-drawer-footer relative shrink-0 border-t px-4 py-3 sm:px-5">
              <div className="qa-ref-drawer-actions">
                <a
                  href={resolveOfferClickUrl(p)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="qa-ui-btn-primary flex-1 py-3 text-sm"
                >
                  Review listing
                  <ExternalLink className="size-4 opacity-80" strokeWidth={1.5} aria-hidden />
                </a>
                {onSave ? (
                  <button
                    type="button"
                    onClick={() => onSave(p)}
                    disabled={saved}
                    className="qa-ref-drawer-actions__secondary"
                  >
                    {saved ? "Saved" : "Save"}
                  </button>
                ) : null}
              </div>
            </footer>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(panel, document.body);
}

function DrawerBody({ p, list }: { p: QuantProduct; list: QuantProduct[] }) {
  const comp = getFinalComposite(p, list);
  const band = decisionBand(p, list);
  const { pros, cons } = getProsAndCons(p, list);
  const why = getWhyQuantAIRecommends(p, list, comp);
  const trust = getStoreTrustScore(p.store);
  const avg = listAveragePrice(list);
  const alternatives = pickSimilarAlternatives(p, list, 4);

  const matrixPrice =
    avg > 0 && p.price > 0
      ? p.price < avg * 0.97
        ? "Below set average"
        : p.price > avg * 1.05
          ? "Above set average"
          : "Near set average"
      : "—";
  const signalRows = p.qiSignals
    ? (
        [
          ["Price fit", p.qiSignals.priceFit, "How this ask sits versus the basket median and spread."],
          ["Rating signal", p.qiSignals.rating, "Star strength normalized against the visible band."],
          ["Review depth", p.qiSignals.reviewDepth, "Volume and stability of social proof."],
          ["Retailer trust signal", p.qiSignals.retailerTrust, "Pattern match to known, lower-friction retailers."],
          ["Delivery signal", p.qiSignals.delivery, "Heuristic read of speed / friction from shipping copy."],
          ["Popularity", p.qiSignals.popularity, "Blended reach of reviews and stars."],
          ["Price-to-quality", p.qiSignals.pricePerformance, "Core price-to-quality balance vs peers."],
          ["Discount quality", p.qiSignals.discountQuality, "Honesty and depth of markdown vs reference price."],
        ] as const
      ).map(([label, val, hint]) => ({ label, val, hint }))
    : [];

  const topSignals = signalRows.slice(0, 4);
  const bandLabel = band === "buy" ? "Buy lane" : band === "wait" ? "Wait lane" : "Compare lane";
  const compactSynthesis = [quantVerdictLead(p, list), p.qiPsychology?.trim(), why]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  const listingReadSummary = [valueAnalysisParagraph(p, list), trustAnalysisParagraph(p, list), priceTrendInsightParagraph(p)]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  const validationChecks = (cons.length ? cons : ["Confirm seller, warranty, and final checkout terms before execution."]).slice(0, 3);
  const signalAdvantages = pros.slice(0, 4);

  return (
    <div className="qa-ui-drawer-stack qa-cine-drawer-stack">
      <div className="qa-ui-drawer-hero qa-cine-drawer-hero">
        <div className="qa-ui-drawer-hero-top">
          <p className="qa-ui-type-label">Intelligence synthesis</p>
          <span className="qa-ui-drawer-chip">QI {comp}</span>
        </div>
        <p className="qa-ui-drawer-hero-lead line-clamp-6">{compactSynthesis}</p>
      </div>

      <div className="qa-ui-drawer-metrics-row">
        <div className="qa-ui-drawer-metric">
          <p className="qa-ui-drawer-metric-label">Stance</p>
          <p className="qa-ui-drawer-metric-value">{bandLabel}</p>
        </div>
        <div className="qa-ui-drawer-metric">
          <p className="qa-ui-drawer-metric-label">Trust</p>
          <p className="qa-ui-drawer-metric-value tabular-nums">{trust}</p>
        </div>
        <div className="qa-ui-drawer-metric">
          <p className="qa-ui-drawer-metric-label">Price</p>
          <p className="qa-ui-drawer-metric-value">{matrixPrice}</p>
        </div>
      </div>

      {p.qiBuyingDecision ? (
        <DrawerModule title="Execution posture">
          <p className="qa-ui-drawer-lead">{intelligenceDecisionLabel(p.qiBuyingDecision.action)}</p>
          <p className="qa-ui-drawer-copy line-clamp-3">{p.qiBuyingDecision.analystLine}</p>
        </DrawerModule>
      ) : null}

      <DrawerModule title="Signal advantages">
        {signalAdvantages.length > 0 ? (
          <ul className="qa-ui-drawer-bullets">
            {signalAdvantages.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        ) : (
          <p className="qa-ui-drawer-copy line-clamp-3">
            Core signals remain within expected variance for this tray.
          </p>
        )}
      </DrawerModule>

      <DrawerModule title="Validation layer">
        <ul className="qa-ui-drawer-bullets">
          {validationChecks.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      </DrawerModule>

      <DrawerModule title="Supporting intelligence">
        <div className="qa-ui-drawer-split">
          <div>
            <p className="qa-ui-drawer-split-label">Decision lane</p>
            <p className="qa-ui-drawer-copy line-clamp-3">{bandLabel}</p>
          </div>
          <div>
            <p className="qa-ui-drawer-split-label">Confidence context</p>
            <p className="qa-ui-drawer-copy line-clamp-3">Trust {trust} · QI {comp} · {matrixPrice}</p>
          </div>
        </div>
      </DrawerModule>

      {topSignals.length > 0 ? (
        <DrawerModule title="Signal profile" act="fold" defaultOpen={false}>
          <ul className="qa-ui-drawer-signal-list">
            {topSignals.map((row) => (
              <li key={row.label} className="qa-ui-drawer-signal-row">
                <div className="qa-ui-drawer-signal-head">
                  <span className="qa-ui-drawer-signal-label">{row.label}</span>
                  <span className="qa-ui-drawer-signal-value tabular-nums">{row.val}</span>
                </div>
                <SignalBar value={row.val} />
              </li>
            ))}
          </ul>
        </DrawerModule>
      ) : null}

      <DrawerModule title="Listing read" act="fold" defaultOpen={false}>
        <p className="qa-ui-drawer-copy line-clamp-6">{listingReadSummary}</p>
      </DrawerModule>

      {alternatives.length > 0 ? (
        <DrawerModule title="Peer alternatives" act="fold" defaultOpen={false}>
          <p className="qa-ui-drawer-copy line-clamp-3">
            {alternatives.length} peer listings remain within this decision envelope. Compare trust, pricing posture, and QI before execution.
          </p>
          <ul className="qa-ui-drawer-alt-list">
            {alternatives.map((alt) => (
              <li key={alt.link} className="qa-ui-drawer-alt-item">
                <div className="min-w-0 flex-1">
                  <p className="qa-ui-drawer-alt-title">{alt.title}</p>
                  <p className="qa-ui-drawer-alt-meta">{alt.store}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="qa-ui-drawer-alt-price tabular-nums">€{alt.price}</p>
                  <p className="qa-ui-drawer-alt-qi">QI {getFinalComposite(alt, list)}</p>
                </div>
                <a
                  href={alt.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="qa-ui-compare-icon-btn shrink-0"
                  aria-label={`Open ${alt.title}`}
                >
                  <ExternalLink className="size-3.5" strokeWidth={1.5} />
                </a>
              </li>
            ))}
          </ul>
        </DrawerModule>
      ) : null}

      <p className="qa-ui-drawer-footnote">
        Informational analysis for this search snapshot—not financial advice. Confirm price, warranty, and seller at checkout.
      </p>
    </div>
  );
}
