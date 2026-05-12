"use client";

import Image from "next/image";
import { Sparkles } from "lucide-react";
import { getFinalComposite, getStoreTrustScore, ratingValue } from "@/lib/shoppingScore";
import type { QuantProduct } from "@/lib/shoppingScore";
import { currencySymbolFromListing, formatListingPrice } from "@/lib/commerce/cues";
import type { SnapshotMode } from "@/lib/share/snapshotModes";
import { snapshotModeLabel } from "@/lib/share/snapshotModes";

type Props = {
  product: QuantProduct;
  list: QuantProduct[];
  className?: string;
  mode?: SnapshotMode;
  /** Vertical-friendly frame for stories / mobile screenshots */
  layout?: "default" | "story";
  showShareFooter?: boolean;
};

export default function QuantAISnapshotCard({
  product: p,
  list,
  className = "",
  mode = "default",
  layout = "default",
  showShareFooter = true,
}: Props) {
  const qi = getFinalComposite(p, list);
  const trust = getStoreTrustScore(p.store);
  const verdict =
    p.qiVerdict?.trim() ||
    p.qiCommerce?.buyingVerdict?.trim() ||
    p.qiPsychology?.trim() ||
    "—";
  const reason = (p.qiReason ?? "").trim().slice(0, 220);
  const sym = currencySymbolFromListing(p);
  const stars = ratingValue(p.rating);
  const conf = p.qiCommerce?.confidence;
  const confLine =
    conf != null
      ? `Model confidence ${conf}/100${p.qiCommerce?.confidenceExplanation ? ` · ${p.qiCommerce.confidenceExplanation.trim().slice(0, 120)}${p.qiCommerce.confidenceExplanation.length > 120 ? "…" : ""}` : ""}`
      : null;
  const risk = p.qiCommerce?.retailerRiskScore;
  const riskLine = risk != null ? `Retailer-risk heuristic ${risk}/100 (interpretive, not legal advice).` : null;

  const modeLabel = mode !== "default" ? snapshotModeLabel(mode) : null;
  const story = layout === "story";

  const inner = (
    <div
      data-quantai-share-card
      className={`relative overflow-hidden rounded-2xl border border-white/[0.1] bg-gradient-to-br from-[#0a1428] via-[#060b18] to-black p-4 shadow-[0_24px_60px_-28px_rgba(34,211,238,0.25)] ${className}`}
    >
      <div className="pointer-events-none absolute -right-8 -top-8 size-32 rounded-full bg-cyan-400/10 blur-2xl" />
      <div className="relative flex gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg border border-cyan-400/25 bg-cyan-500/15">
              <Sparkles className="size-4 text-cyan-100" strokeWidth={1.5} aria-hidden />
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-300/85">QuantAI</span>
            {modeLabel ? (
              <span className="rounded-full border border-white/[0.1] bg-white/[0.05] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-slate-300">
                {modeLabel}
              </span>
            ) : null}
          </div>
          <p className="line-clamp-2 text-sm font-semibold leading-snug text-white/95">{p.title}</p>
          <p className="text-[11px] text-slate-500">{p.store}</p>
        </div>
        {p.image ? (
          <div className="relative size-20 shrink-0 overflow-hidden rounded-xl border border-white/[0.08] bg-white p-1.5">
            <Image src={p.image} alt="" fill sizes="80px" className="object-contain" unoptimized />
          </div>
        ) : null}
      </div>
      <div className="relative mt-3 grid grid-cols-3 gap-2 border-t border-white/[0.06] pt-3">
        <div className="rounded-lg border border-white/[0.07] bg-black/35 px-2 py-1.5 text-center">
          <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">QI</p>
          <p className="text-lg font-bold tabular-nums text-cyan-100">{qi}</p>
        </div>
        <div className="rounded-lg border border-white/[0.07] bg-black/35 px-2 py-1.5 text-center">
          <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">Trust</p>
          <p className="text-lg font-bold tabular-nums text-emerald-200/95">{trust}</p>
        </div>
        <div className="rounded-lg border border-white/[0.07] bg-black/35 px-2 py-1.5 text-center">
          <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">Rating</p>
          <p className="text-lg font-bold tabular-nums text-amber-100/95">{stars > 0 ? stars.toFixed(1) : "—"}</p>
        </div>
      </div>
      <p className="relative mt-2 text-[11px] font-medium leading-snug text-violet-100/95 line-clamp-2">{verdict}</p>
      {reason ? (
        <p className="relative mt-1.5 text-[10px] leading-relaxed text-slate-500 line-clamp-3">{reason}</p>
      ) : null}
      {confLine ? <p className="relative mt-2 text-[10px] leading-relaxed text-slate-400 line-clamp-3">{confLine}</p> : null}
      {riskLine ? <p className="relative mt-1 text-[10px] leading-relaxed text-slate-500 line-clamp-2">{riskLine}</p> : null}
      <p className="relative mt-2 text-xs font-semibold tabular-nums text-emerald-200/90">
        {formatListingPrice(p.price, sym)}
      </p>
      {showShareFooter ? (
        <p className="relative mt-3 border-t border-white/[0.06] pt-2 text-[9px] font-medium uppercase tracking-[0.14em] text-slate-600">
          Shared from QuantAI
        </p>
      ) : null}
    </div>
  );

  if (story) {
    return (
      <div className="mx-auto w-full max-w-[280px]">
        <div className="aspect-[9/16] max-h-[min(520px,70dvh)] w-full overflow-hidden rounded-[1.35rem] border border-white/[0.08] bg-black/40 p-1.5 shadow-[0_30px_80px_-30px_rgba(99,102,241,0.35)]">
          <div className="h-full overflow-y-auto overscroll-contain rounded-[1.1rem]">{inner}</div>
        </div>
      </div>
    );
  }

  return inner;
}
