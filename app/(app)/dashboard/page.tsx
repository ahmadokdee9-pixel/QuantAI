import Link from "next/link";
import {
  Search,
  Bookmark,
  Bell,
  TrendingDown,
  Brain,
  ArrowRight,
} from "lucide-react";

const stats = [
  {
    label: "Products analyzed",
    value: "1,284",
    change: "+18.2%",
  },
  {
    label: "Average AI confidence",
    value: "91%",
    change: "+4.8%",
  },
  {
    label: "Estimated savings",
    value: "€742",
    change: "+€126",
  },
  {
    label: "Live alerts",
    value: "24",
    change: "8 active",
  },
];

const recentProducts = [
  {
    name: "Apple MacBook Air",
    store: "Back Market",
    price: "€669",
    score: "86%",
    status: "Top Rated",
  },
  {
    name: "Lenovo IdeaPad Slim 3",
    store: "Coolblue",
    price: "€299",
    score: "88%",
    status: "Best AI Pick",
  },
  {
    name: "Acer Chromebook 314",
    store: "Coolblue",
    price: "€299",
    score: "76%",
    status: "Good Choice",
  },
];

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-4 py-2 text-sm text-cyan-200">
              <Brain size={16} />
              AI shopping intelligence dashboard
            </div>

            <h1 className="max-w-3xl text-4xl font-bold tracking-tight md:text-5xl">
              Make better buying decisions with real-time AI.
            </h1>

            <p className="mt-4 max-w-2xl text-gray-400">
              Track products, monitor prices, receive alerts, and let QuantAI
              recommend the smartest time to buy.
            </p>
          </div>

          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan-400 px-5 py-3 font-bold text-black transition hover:bg-cyan-300"
          >
            Analyze product
            <Search size={18} />
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl"
          >
            <p className="text-sm text-gray-400">{stat.label}</p>

            <div className="mt-3 flex items-end justify-between">
              <h2 className="text-3xl font-bold">{stat.value}</h2>

              <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300">
                {stat.change}
              </span>
            </div>
          </div>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2 rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">
                Recent AI analysis
              </h2>

              <p className="text-sm text-gray-400">
                Products recently analyzed by QuantAI.
              </p>
            </div>

            <Link
              href="/saved"
              className="flex items-center gap-1 text-sm text-cyan-300 hover:text-cyan-200"
            >
              View all
              <ArrowRight size={16} />
            </Link>
          </div>

          <div className="space-y-3">
            {recentProducts.map((product) => (
              <div
                key={product.name}
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 p-4"
              >
                <div>
                  <h3 className="font-semibold">
                    {product.name}
                  </h3>

                  <p className="text-sm text-gray-400">
                    {product.store}
                  </p>
                </div>

                <div className="hidden text-right sm:block">
                  <p className="font-bold">
                    {product.price}
                  </p>

                  <p className="text-sm text-cyan-300">
                    AI Score {product.score}
                  </p>
                </div>

                <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300">
                  {product.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
          <h2 className="text-xl font-bold">
            AI Actions
          </h2>

          <p className="mt-1 text-sm text-gray-400">
            Continue building your shopping intelligence.
          </p>

          <div className="mt-6 space-y-3">
            <Link
              href="/saved"
              className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 p-4 transition hover:bg-white/10"
            >
              <span className="flex items-center gap-3">
                <Bookmark
                  size={18}
                  className="text-cyan-300"
                />
                Saved products
              </span>

              <ArrowRight size={16} />
            </Link>

            <Link
              href="/alerts"
              className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 p-4 transition hover:bg-white/10"
            >
              <span className="flex items-center gap-3">
                <Bell
                  size={18}
                  className="text-cyan-300"
                />
                Price alerts
              </span>

              <ArrowRight size={16} />
            </Link>

            <Link
              href="/analytics"
              className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 p-4 transition hover:bg-white/10"
            >
              <span className="flex items-center gap-3">
                <TrendingDown
                  size={18}
                  className="text-cyan-300"
                />
                Savings analytics
              </span>

              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}