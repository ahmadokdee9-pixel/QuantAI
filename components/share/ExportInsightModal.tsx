"use client";

import { useCallback, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, Copy, Share2, X } from "lucide-react";
import type { SearchIntelligenceDTO } from "@/lib/intelligence/searchDecisionTypes";
import type { QuantProduct } from "@/lib/shoppingScore";
import QuantAISnapshotCard from "@/components/snapshot/QuantAISnapshotCard";
import { buildIntelligenceShareText, buildProductSnapshot, buildTraySummary, copyText, shareText } from "@/lib/share/intelligenceExport";

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
  const top = products[0];

  const fullExport = useCallback(() => {
    const tray = buildTraySummary(query.trim() || "—", products);
    const intel = buildIntelligenceShareText(intelligence);
    if (intel) return `${tray}\n\n---\n\n${intel}`;
    return tray;
  }, [query, products, intelligence]);

  const snapshotLine = useCallback(() => {
    if (!top) return fullExport();
    return `${buildProductSnapshot(top, products)}\n\n${fullExport()}`;
  }, [top, products, fullExport]);

  async function onCopy(kind: "tray" | "intel" | "snapshot") {
    let text = fullExport();
    if (kind === "intel") text = buildIntelligenceShareText(intelligence) || text;
    if (kind === "snapshot" && top) text = snapshotLine();
    const ok = await copyText(text);
    if (ok) {
      setFlash("copy");
      window.setTimeout(() => setFlash(null), 2000);
    }
  }

  async function onShare(kind: "tray" | "snapshot") {
    const title = "QuantAI · insight export";
    const text = kind === "snapshot" && top ? snapshotLine() : fullExport();
    const ok = await shareText(title, text);
    if (ok) {
      setFlash("share");
      window.setTimeout(() => setFlash(null), 2000);
    } else {
      void onCopy("tray");
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
            className="relative z-[1] max-h-[min(90dvh,36rem)] w-full max-w-md overflow-y-auto overscroll-contain rounded-2xl border border-white/[0.1] bg-[#060b18]/98 p-4 shadow-2xl backdrop-blur-xl sm:p-5"
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
              Copy plain-text summaries or use your device share sheet. No server-side image generation—perfect for
              messages and notes.
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
              {top ? (
                <button
                  type="button"
                  onClick={() => void onCopy("snapshot")}
                  className="inline-flex items-center gap-1.5 rounded-full border border-violet-400/25 bg-violet-500/10 px-3 py-2 text-[11px] font-semibold text-violet-100"
                >
                  <Copy className="size-3.5" />
                  Copy top pick + tray
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => void onShare("tray")}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/12 px-3 py-2 text-[11px] font-semibold text-slate-200"
              >
                {flash === "share" ? <Check className="size-3.5 text-emerald-300" /> : <Share2 className="size-3.5" />}
                Share snapshot
              </button>
            </div>
            {top ? (
              <div className="mt-5">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Insight card</p>
                <QuantAISnapshotCard product={top} list={products} />
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
