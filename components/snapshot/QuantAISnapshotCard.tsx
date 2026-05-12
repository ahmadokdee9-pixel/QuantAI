"use client";

import Image from "next/image";
import { Sparkles } from "lucide-react";
import { getFinalComposite, getStoreTrustScore, ratingValue } from "@/lib/shoppingScore";
import type { QuantProduct } from "@/lib/shoppingScore";
import { currencySymbolFromListing, formatListingPrice } from "@/lib/commerce/cues";

type Props = {
  product: QuantProduct;
  list: QuantProduct[];
  className?: string;
};

export default function QuantAISnapshotCard({ product: p, list, className = "" }: Props) {
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

  return (
    <div
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
      <p className="relative mt-2 text-xs font-semibold tabular-nums text-emerald-200/90">
        {formatListingPrice(p.price, sym)}
      </p>
    </div>
  );
}
