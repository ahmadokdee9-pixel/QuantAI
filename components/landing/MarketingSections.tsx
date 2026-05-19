import {
  ArrowRight,
  BarChart3,
  BellRing,
  Check,
  GitCompare,
  MessageSquare,
  Radar,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  Zap,
} from "lucide-react";
import Link from "next/link";

const validationNotes = [
  {
    signal: "Discount integrity",
    note: "Detected fake discount inflation before checkout.",
    marker: "QI · Price intelligence",
  },
  {
    signal: "Retail trust",
    note: "Retail trust scoring exposed weak seller quality.",
    marker: "QI · Trust layer",
  },
  {
    signal: "Purchase signal",
    note: "Signal layer prevented overpriced purchase.",
    marker: "QI · Decision engine",
  },
] as const;

export default function MarketingSections() {
  return (
    <div className="relative z-10">
      {/* AI recommendations preview */}
      <section
        id="features"
        className="mx-auto max-w-6xl px-4 sm:px-6 py-20 sm:py-28 scroll-mt-24"
      >
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8 mb-14">
          <div className="max-w-2xl">
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-cyan-300/80 mb-4">
              Intelligence layer
            </p>
            <h2 className="qi-editorial-display text-3xl sm:text-4xl text-white/95 leading-[1.12]">
              Intelligence you can stand behind.
            </h2>
            <p className="qi-silent-whisper mt-4 max-w-lg">
              Live listings read as one field—not isolated cards.
            </p>
          </div>
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 self-start rounded-full border border-white/12 bg-white/[0.04] px-5 py-2.5 text-sm font-medium text-white/90 backdrop-blur-xl transition hover:border-cyan-400/35 hover:bg-cyan-400/[0.08] hover:text-white"
          >
            View plans
            <ArrowRight className="size-4 opacity-70" aria-hidden />
          </Link>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {[
            {
              icon: Sparkles,
              title: "Contextual ranking",
              body: "Every result is judged against the full set you are looking at—not in isolation.",
            },
            {
              icon: ShieldCheck,
              title: "Trust-aware stores",
              body: "Familiar retailers and marketplaces lift confidence when everything else is equal.",
            },
            {
              icon: MessageSquare,
              title: "Ask follow-ups",
              body: "Compare alternatives, pressure-test price, or sanity-check delivery before you buy.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="group relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-b from-white/[0.07] to-white/[0.02] p-7 shadow-[0_24px_80px_-24px_rgba(0,0,0,0.85)] backdrop-blur-2xl transition duration-500 hover:border-cyan-400/25 hover:shadow-[0_32px_100px_-20px_rgba(34,211,238,0.12)]"
            >
              <div className="pointer-events-none absolute -right-8 -top-8 size-32 rounded-full bg-cyan-400/10 blur-3xl transition group-hover:bg-cyan-400/18" />
              <item.icon
                className="relative size-9 text-cyan-300/90"
                strokeWidth={1.25}
                aria-hidden
              />
              <h3 className="relative mt-5 text-lg font-semibold tracking-tight text-white">
                {item.title}
              </h3>
              <p className="relative mt-2 text-sm leading-relaxed text-white/50 font-normal">
                {item.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Smart price alerts */}
      <section
        id="alerts"
        className="border-y border-white/[0.06] bg-gradient-to-b from-white/[0.03] to-transparent scroll-mt-24"
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-20 sm:py-28">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.22em] text-violet-300/80 mb-4">
                Smart price alerts
              </p>
              <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-white/95 leading-[1.15]">
                Never miss the window when a deal becomes a strong buy.
              </h2>
              <p className="mt-4 text-base sm:text-lg text-white/55 leading-relaxed">
                Save what matters, set your tolerance, and let QuantAI watch the signals
                that actually predict a better checkout—not noise from random sellers.
              </p>
              <ul className="mt-8 space-y-4">
                {[
                  "Threshold alerts tuned to your budget and category",
                  "Fewer pings, higher signal—built for busy buyers",
                  "Designed to pair with your saved shortlist",
                ].map((t) => (
                  <li key={t} className="flex gap-3 text-sm text-white/65">
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-400/15 text-emerald-300">
                      <Check className="size-3" strokeWidth={2.5} aria-hidden />
                    </span>
                    {t}
                  </li>
                ))}
              </ul>
            </div>

            <div className="relative">
              <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-br from-cyan-500/20 via-transparent to-violet-500/20 blur-3xl" />
              <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 shadow-[0_40px_120px_-40px_rgba(0,0,0,0.9)] backdrop-blur-2xl">
                <div className="flex items-center justify-between border-b border-white/10 pb-5">
                  <div className="flex items-center gap-3">
                    <div className="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400/25 to-violet-500/25 border border-white/10">
                      <BellRing className="size-5 text-cyan-200" strokeWidth={1.5} aria-hidden />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white/90">Quiet monitoring</p>
                      <p className="text-xs text-white/45">Example alert surface</p>
                    </div>
                  </div>
                  <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-emerald-200/90">
                    Live
                  </span>
                </div>
                <div className="mt-6 space-y-4">
                  <div className="rounded-2xl border border-white/[0.06] bg-black/25 p-4 transition hover:border-white/12">
                    <p className="text-xs text-white/40">Wireless earbuds · Coolblue</p>
                    <p className="mt-1 text-sm font-medium text-white/90">
                      Price crossed your target band
                    </p>
                    <p className="mt-2 text-xs text-cyan-300/80">
                      Stronger deal vs. median of last search
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/[0.06] bg-black/20 p-4 opacity-80">
                    <p className="text-xs text-white/40">4K monitor · Amazon</p>
                    <p className="mt-1 text-sm font-medium text-white/80">
                      Holding — volatility in listings
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Intelligence validation */}
      <section
        id="validation"
        className="mx-auto max-w-6xl px-4 sm:px-6 py-20 sm:py-28 scroll-mt-24"
      >
        <div className="text-center max-w-2xl mx-auto mb-12">
          <p className="qi-validation-overline mb-3">Intelligence validation layer</p>
          <h2 className="qi-editorial-display text-2xl sm:text-3xl text-white/95">
            Commerce signals under field review
          </h2>
        </div>
        <div className="qi-validation-grid">
          {validationNotes.map((v) => (
            <figure key={v.signal} className="qi-validation-card">
              <span className="qi-validation-card-glow" aria-hidden />
              <figcaption className="qi-validation-signal">{v.signal}</figcaption>
              <blockquote className="qi-validation-quote">&ldquo;{v.note}&rdquo;</blockquote>
              <p className="qi-validation-marker">{v.marker}</p>
            </figure>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section
        id="how-it-works"
        className="mx-auto max-w-6xl px-4 sm:px-6 py-20 sm:py-28 scroll-mt-24"
      >
        <div className="rounded-[2rem] border border-white/[0.08] bg-gradient-to-br from-white/[0.06] via-white/[0.02] to-transparent p-8 sm:p-12 lg:p-14 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] backdrop-blur-2xl">
          <div className="max-w-2xl">
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-cyan-300/80 mb-4">
              How QuantAI works
            </p>
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-white/95 leading-[1.15]">
              Three disciplined steps. One confident checkout.
            </h2>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {[
              {
                step: "01",
                title: "Search once",
                desc: "Pull live offers from major retailers in a single, comparable view.",
                icon: Radar,
              },
              {
                step: "02",
                title: "Score as a set",
                desc: "Price, ratings, and store trust are weighted against the full shortlist.",
                icon: BarChart3,
              },
              {
                step: "03",
                title: "Decide with AI",
                desc: "Ask follow-ups, save picks, and move to purchase with receipts for your logic.",
                icon: Zap,
              },
            ].map((s) => (
              <div
                key={s.step}
                className="relative rounded-2xl border border-white/[0.06] bg-black/20 p-6 transition hover:border-cyan-400/20"
              >
                <span className="text-[10px] font-semibold tracking-[0.2em] text-white/35">
                  {s.step}
                </span>
                <s.icon className="mt-4 size-8 text-cyan-300/85" strokeWidth={1.25} aria-hidden />
                <h3 className="mt-4 text-lg font-semibold text-white/95">{s.title}</h3>
                <p className="mt-2 text-sm text-white/50 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* vs normal search */}
      <section
        id="compare"
        className="mx-auto max-w-6xl px-4 sm:px-6 py-20 sm:py-28 scroll-mt-24"
      >
        <div className="text-center max-w-2xl mx-auto mb-14">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-white/40 mb-4">
            QuantAI vs typical search
          </p>
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-white/95">
            Shopping search shows links. QuantAI shows judgment.
          </h2>
        </div>

        <div className="overflow-hidden rounded-[2rem] border border-white/[0.08] bg-white/[0.02] backdrop-blur-xl shadow-[0_40px_100px_-48px_rgba(0,0,0,0.9)]">
          <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-white/[0.06]">
            <div className="p-8 sm:p-10">
              <div className="flex items-center gap-2 text-white/45 mb-6">
                <GitCompare className="size-4" strokeWidth={1.5} aria-hidden />
                <span className="text-xs font-medium uppercase tracking-wider">Classic search</span>
              </div>
              <ul className="space-y-4 text-sm text-white/50">
                <li className="flex gap-2">
                  <span className="text-white/25">—</span> Ten blue links, zero context on tradeoffs
                </li>
                <li className="flex gap-2">
                  <span className="text-white/25">—</span> Ads and SEO winners, not your priorities
                </li>
                <li className="flex gap-2">
                  <span className="text-white/25">—</span> You rebuild the spreadsheet in your head
                </li>
              </ul>
            </div>
            <div className="p-8 sm:p-10 relative overflow-hidden">
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-violet-500/10" />
              <div className="relative flex items-center gap-2 text-cyan-300/90 mb-6">
                <Sparkles className="size-4" strokeWidth={1.5} aria-hidden />
                <span className="text-xs font-medium uppercase tracking-wider">QuantAI</span>
              </div>
              <ul className="space-y-4 text-sm text-white/70">
                <li className="flex gap-2">
                  <Check className="size-4 shrink-0 text-emerald-400/90 mt-0.5" strokeWidth={2} aria-hidden />
                  One synthesized pick with explicit signals
                </li>
                <li className="flex gap-2">
                  <Check className="size-4 shrink-0 text-emerald-400/90 mt-0.5" strokeWidth={2} aria-hidden />
                  Built to compare price, rating, and retailer trust together
                </li>
                <li className="flex gap-2">
                  <Check className="size-4 shrink-0 text-emerald-400/90 mt-0.5" strokeWidth={2} aria-hidden />
                  AI assistant that already knows your shortlist
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 pb-8">
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-6 py-5 text-xs text-white/40 backdrop-blur-xl">
          <span className="flex items-center gap-2">
            <TrendingDown className="size-3.5 text-cyan-400/60" aria-hidden />
            Signed-in search protects your quota
          </span>
          <span className="hidden sm:inline h-3 w-px bg-white/10" aria-hidden />
          <span className="flex items-center gap-2">
            <ShieldCheck className="size-3.5 text-emerald-400/60" aria-hidden />
            Built for transparent recommendations
          </span>
        </div>
      </section>
    </div>
  );
}
