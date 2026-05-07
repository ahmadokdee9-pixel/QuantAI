import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { Bookmark, ExternalLink, Trash2 } from "lucide-react";
import { supabaseAdmin } from "@/app/api/search/lib/supabaseAdmin";

export default async function SavedProductsPage() {
  const { userId } = await auth();

  if (!userId) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8">
        <h1 className="text-3xl font-bold">Saved Products</h1>
        <p className="mt-3 text-gray-400">
          Please sign in to view your saved products.
        </p>
      </div>
    );
  }

  const { data: products, error } = await supabaseAdmin
    .from("saved_products")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-8">
        <h1 className="text-3xl font-bold">Saved Products</h1>
        <p className="mt-3 text-red-300">
          Failed to load saved products.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-4 py-2 text-sm text-cyan-200">
          <Bookmark size={16} />
          Saved product intelligence
        </div>

        <h1 className="mt-5 text-4xl font-bold">
          Saved Products
        </h1>

        <p className="mt-3 max-w-2xl text-gray-400">
          Track your saved products, compare prices, and let QuantAI monitor
          better buying opportunities for you.
        </p>
      </section>

      {!products || products.length === 0 ? (
        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-10 text-center backdrop-blur-xl">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-cyan-500/10 text-cyan-300">
            <Bookmark size={28} />
          </div>

          <h2 className="mt-6 text-2xl font-bold">
            No saved products yet
          </h2>

          <p className="mx-auto mt-3 max-w-md text-gray-400">
            Start analyzing products from the homepage and save the best AI
            recommendations here.
          </p>

          <Link
            href="/"
            className="mt-6 inline-flex rounded-2xl bg-cyan-400 px-5 py-3 font-bold text-black transition hover:bg-cyan-300"
          >
            Analyze products
          </Link>
        </section>
      ) : (
        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {products.map((product) => (
            <div
              key={product.id}
              className="group relative overflow-hidden rounded-3xl border border-cyan-400/20 bg-white/[0.04] p-5 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-cyan-400/40 hover:shadow-[0_0_45px_rgba(34,211,238,0.18)]"
            >
              <div className="relative z-10">
                {product.image_url && (
                  <div className="mb-5 flex h-44 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-b from-white to-gray-100 p-4">
                    <img
                      src={product.image_url}
                      alt={product.title || "Saved product"}
                      className="h-full w-full object-contain mix-blend-multiply transition duration-500 group-hover:scale-105"
                    />
                  </div>
                )}

                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="line-clamp-2 text-lg font-bold">
                      {product.title}
                    </h2>

                    <p className="mt-1 text-sm text-gray-400">
                      {product.store || "Unknown store"}
                    </p>
                  </div>

                  <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300">
                    Saved
                  </span>
                </div>

                <div className="mt-5 flex items-end justify-between">
                  <p className="text-3xl font-bold">
                    {product.price || "N/A"}
                  </p>

                  <p className="text-sm text-cyan-300">
                    AI Score {product.ai_score || "—"}
                  </p>
                </div>

                <div className="mt-5 rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-cyan-100">
                      AI Confidence
                    </span>

                    <span className="text-2xl font-bold text-cyan-300">
                      {product.ai_confidence || "86%"}
                    </span>
                  </div>

                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/20">
                    <div className="h-full w-[86%] rounded-full bg-gradient-to-r from-cyan-400 to-blue-500" />
                  </div>
                </div>

                <p className="mt-4 text-sm leading-relaxed text-gray-300">
                  QuantAI is monitoring this product for better prices,
                  stronger deals, and improved buying opportunities.
                </p>

                <div className="mt-6 flex gap-3">
                  {product.product_url && (
                    <Link
                      href={product.product_url}
                      target="_blank"
                      className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-bold text-black transition hover:bg-gray-200"
                    >
                      View offer
                      <ExternalLink size={16} />
                    </Link>
                  )}

                  <button className="flex h-12 w-12 items-center justify-center rounded-2xl border border-red-400/20 bg-red-500/10 text-red-300 transition hover:bg-red-500/20">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}