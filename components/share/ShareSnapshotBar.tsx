"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { Check, Copy, LayoutTemplate, Share2 } from "lucide-react";
import type { SearchIntelligenceDTO } from "@/lib/intelligence/searchDecisionTypes";
import type { QuantProduct } from "@/lib/shoppingScore";
import { buildIntelligenceShareText, buildTraySummary, copyText, shareText } from "@/lib/share/intelligenceExport";

const ExportInsightModal = dynamic(() => import("@/components/share/ExportInsightModal"), {
  ssr: false,
  loading: () => null,
});

type Props = {
  query: string;
  products: QuantProduct[];
  intelligence?: SearchIntelligenceDTO | null;
  className?: string;
};

export default function ShareSnapshotBar({
  query,
  products,
  intelligence = null,
  className = "",
}: Props) {
  const [flash, setFlash] = useState<"copy" | "share" | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportBundle, setExportBundle] = useState(false);

  async function onCopy() {
    const text = buildTraySummary(query.trim() || "—", products);
    const ok = await copyText(text);
    if (ok) {
      setFlash("copy");
      window.setTimeout(() => setFlash(null), 2000);
    }
  }

  async function onShare() {
    const text = buildTraySummary(query.trim() || "—", products);
    const ok = await shareText("QuantAI · intelligence snapshot", text);
    if (ok) {
      setFlash("share");
      window.setTimeout(() => setFlash(null), 2000);
    } else {
      void onCopy();
    }
  }

  async function onCopyIntel() {
    const text = buildIntelligenceShareText(intelligence);
    if (!text) return;
    const ok = await copyText(text);
    if (ok) {
      setFlash("copy");
      window.setTimeout(() => setFlash(null), 2000);
    }
  }

  if (products.length === 0) return null;

  return (
    <>
      <div
        className={`flex flex-wrap items-center gap-1.5 rounded-xl border border-white/[0.06] bg-black/20 px-2.5 py-1.5 backdrop-blur-md ${className}`}
      >
        <button
          type="button"
          onClick={() => void onCopy()}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[11px] font-semibold text-slate-200 transition hover:border-cyan-400/25 hover:bg-cyan-500/10"
        >
          {flash === "copy" ? <Check className="size-3.5 text-emerald-300" aria-hidden /> : <Copy className="size-3.5" />}
          Copy summary
        </button>
        <button
          type="button"
          onClick={() => void onShare()}
          className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/25 bg-cyan-500/10 px-3 py-1.5 text-[11px] font-semibold text-cyan-100 transition hover:bg-cyan-500/15"
        >
          {flash === "share" ? <Check className="size-3.5 text-emerald-300" aria-hidden /> : <Share2 className="size-3.5" />}
          Share snapshot
        </button>
        {intelligence ? (
          <button
            type="button"
            onClick={() => void onCopyIntel()}
            className="inline-flex items-center gap-1.5 rounded-full border border-violet-400/22 bg-violet-500/10 px-3 py-1.5 text-[11px] font-semibold text-violet-100 transition hover:bg-violet-500/15"
          >
            <Copy className="size-3.5" aria-hidden />
            Copy AI briefing
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => {
            setExportBundle(true);
            setExportOpen(true);
          }}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-[11px] font-semibold text-slate-200 transition hover:border-white/20"
        >
          <LayoutTemplate className="size-3.5" aria-hidden />
          Export hub
        </button>
      </div>
      {exportBundle ? (
        <ExportInsightModal
          open={exportOpen}
          onClose={() => setExportOpen(false)}
          query={query}
          products={products}
          intelligence={intelligence}
        />
      ) : null}
    </>
  );
}
