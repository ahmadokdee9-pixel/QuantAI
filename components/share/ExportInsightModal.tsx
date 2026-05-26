"use client";

import { useCallback, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, Copy, Share2, X } from "lucide-react";
import type { SearchIntelligenceDTO } from "@/lib/intelligence/searchDecisionTypes";
import type { QuantProduct } from "@/lib/shoppingScore";
import QuantAISnapshotCard from "@/components/snapshot/QuantAISnapshotCard";
import {
  buildIntelligenceShareText,
  buildProductSnapshot,
  buildTraySummary,
  copyText,
  shareText,
} from "@/lib/share/intelligenceExport";
import type { SnapshotMode } from "@/lib/share/snapshotModes";
import { buildViralSnapshotCaption, pickProductForSnapshotMode, snapshotModeLabel } from "@/lib/share/snapshotModes";

const SNAPSHOT_MODES: SnapshotMode[] = [
  "default",
  "best_long_term",
  "safest_retailer",
  "student_value",
  "performance_per_euro",
  "risk_warning",
  "most_overpriced",
];

type Props = {
  open: boolean;
  onClose: () => void;
  query: string;
  products: QuantProduct[];
  intelligence?: SearchIntelligenceDTO | null;
};

export default function ExportInsightModal({ open, onClose, query, products, intelligence = null }: Props) {
  const reduce = useReducedMotion();
  const [flash, setFlash] = useState<"copy" | "share" | null>(null);
  const [snapshotMode, setSnapshotMode] = useState<SnapshotMode>("default");
  const [storyLayout, setStoryLayout] = useState(false);

  const snapshotProduct = useMemo(
    () => pickProductForSnapshotMode(snapshotMode, products),
    [snapshotMode, products]
  );

  const fullExport = useCallback(() => {
    const tray = buildTraySummary(query.trim() || "—", products);
    const intel = buildIntelligenceShareText(intelligence);
    if (intel) return `${tray}\n\n---\n\n${intel}`;
    return tray;
  }, [query, products, intelligence]);

  async function onCopy(kind: "tray" | "intel" | "snapshot" | "viral") {
    let text = fullExport();
    if (kind === "intel") text = buildIntelligenceShareText(intelligence) || text;
    if (kind === "snapshot") {
      const top = pickProductForSnapshotMode("default", products);
      text = top ? `${buildProductSnapshot(top, products)}\n\n${fullExport()}` : fullExport();
    }
    if (kind === "viral" && snapshotProduct) {
      text = buildViralSnapshotCaption(snapshotMode, snapshotProduct, products);
    }
    const ok = await copyText(text);
    if (ok) {
      setFlash("copy");
      window.setTimeout(() => setFlash(null), 2000);
    }
  }

  async function onShare(kind: "tray" | "snapshot" | "viral") {
    const title = "QuantAI · insight export";
    let text = fullExport();
    if (kind === "snapshot") {
      const top = pickProductForSnapshotMode("default", products);
      text = top ? `${buildProductSnapshot(top, products)}\n\n${fullExport()}` : fullExport();
    }
    if (kind === "viral" && snapshotProduct) {
      text = buildViralSnapshotCaption(snapshotMode, snapshotProduct, products);
    }
    const ok = await shareText(title, text);
    if (ok) {
      setFlash("share");
      window.setTimeout(() => setFlash(null), 2000);
    } else {
      void onCopy(kind === "viral" ? "viral" : "tray");
    }
  }

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[95] flex items-end justify-center p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:items-center sm:p-6"
          initial={{ opacity: reduce ? 1 : 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: reduce ? 1 : 0 }}
          role="dialog"
          aria-modal="true"
          aria-label="Export insight"
        >
          <button type="button" className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} aria-label="Close" />
          <motion.div
            initial={{ opacity: reduce ? 1 : 0, y: reduce ? 0 : 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: reduce ? 1 : 0, y: reduce ? 0 : 12 }}
            transition={{ type: "spring", stiffness: 400, damping: 34 }}
            className="qa-modal-panel relative z-[1] max-h-[min(92dvh,44rem)] w-full max-w-md overflow-y-auto overscroll-contain p-4 sm:p-5"
          >
            <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] pb-3">
              <p className="text-sm font-semibold text-white">Share & export</p>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-white/10 p-2 text-slate-400 hover:bg-white/[0.06] hover:text-white"
                aria-label="Close export"
              >
                <X className="size-4" />
              </button>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-slate-500">
              Copy plain-text summaries or use your device share sheet. Cards are sized for screenshots—no server-side
              image rendering.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void onCopy("tray")}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.06] px-3 py-2 text-[11px] font-semibold text-slate-200"
              >
                {flash === "copy" ? <Check className="size-3.5 text-emerald-300" /> : <Copy className="size-3.5" />}
                Copy tray summary
              </button>
              {intelligence ? (
                <button
                  type="button"
                  onClick={() => void onCopy("intel")}
                  className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/25 bg-cyan-500/10 px-3 py-2 text-[11px] font-semibold text-cyan-100"
                >
                  <Copy className="size-3.5" />
                  Copy AI briefing
                </button>
              ) : null}
              {products[0] ? (
                <button
                  type="button"
                  onClick={() => void onCopy("snapshot")}
                  className="inline-flex items-center gap-1.5 rounded-full border border-violet-400/25 bg-violet-500/10 px-3 py-2 text-[11px] font-semibold text-violet-100"
                >
                  <Copy className="size-3.5" />
                  Copy top pick + tray
                </button>
              ) : null}
              {snapshotProduct ? (
                <button
                  type="button"
                  onClick={() => void onCopy("viral")}
                  className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/25 bg-emerald-500/10 px-3 py-2 text-[11px] font-semibold text-emerald-100"
                >
                  <Copy className="size-3.5" />
                  Copy AI snapshot (text)
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => void onShare("tray")}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/12 px-3 py-2 text-[11px] font-semibold text-slate-200"
              >
                {flash === "share" ? <Check className="size-3.5 text-emerald-300" /> : <Share2 className="size-3.5" />}
                Share summary
              </button>
              {snapshotProduct ? (
                <button
                  type="button"
                  onClick={() => void onShare("viral")}
                  className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/22 px-3 py-2 text-[11px] font-semibold text-cyan-100"
                >
                  <Share2 className="size-3.5" />
                  Share AI snapshot
                </button>
              ) : null}
            </div>

            {snapshotProduct ? (
              <div className="mt-5 space-y-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">AI snapshot mode</p>
                <div className="flex flex-wrap gap-1.5">
                  {SNAPSHOT_MODES.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setSnapshotMode(m)}
                      className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold transition ${
                        snapshotMode === m
                          ? "border-cyan-400/35 bg-cyan-500/15 text-cyan-50"
                          : "border-white/[0.08] bg-white/[0.03] text-slate-400 hover:border-white/15"
                      }`}
                    >
                      {snapshotModeLabel(m)}
                    </button>
                  ))}
                </div>
                <label className="flex cursor-pointer items-center gap-2 text-[11px] text-slate-400">
                  <input
                    type="checkbox"
                    checked={storyLayout}
                    onChange={(e) => setStoryLayout(e.target.checked)}
                    className="rounded border-white/20 bg-black/40"
                  />
                  Story / vertical frame (screenshot helper)
                </label>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Insight card</p>
                <QuantAISnapshotCard
                  product={snapshotProduct}
                  list={products}
                  mode={snapshotMode}
                  layout={storyLayout ? "story" : "default"}
                />
              </div>
            ) : (
              <p className="mt-5 text-xs text-slate-500">Run a search to unlock the visual insight card.</p>
            )}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
