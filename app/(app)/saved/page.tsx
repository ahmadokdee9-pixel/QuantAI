import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { Bookmark } from "lucide-react";
import { supabaseAdmin } from "@/app/api/search/lib/supabaseAdmin";

export default async function SavedProductsPage() {
  const { userId } = await auth();

  if (!userId) {
    return (
      <div className="text-white p-10">
        Please sign in.
      </div>
    );
  }

  const { data: products } = await supabaseAdmin
    .from("saved_products")
    .select("*")
    .eq("user_id", userId);

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-4 py-2 text-sm text-cyan-200">
          <Bookmark size={16} />
          Saved product intelligence
        </div>

        <h1 className="mt-5 text-4xl font-bold text-white">
          Saved Products
        </h1>

        <p className="mt-3 max-w-2xl text-gray-400">
          Your saved AI-analyzed products.
        </p>
      </section>

      {!products || products.length === 0 ? (
        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-10 text-center backdrop-blur-xl">
          <h2 className="text-2xl font-bold text-white">
            No saved products yet
          </h2>

          <p className="mt-3 text-gray-400">
            Analyze and save products from the homepage.
          </p>

          <Link
            href="/"
            className="mt-6 inline-flex rounded-2xl bg-cyan-400 px-5 py-3 font-bold text-black"
          >
            Analyze products
          </Link>
        </section>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {products.map((product: any) => (
            <div
              key={product.id}
              className="rounded-3xl border border-white/10 bg-white/[0.04] p-5"
            >
              <h2 className="text-xl font-bold text-white">
                {product.title}
              </h2>

              <p className="mt-2 text-gray-400">
                {product.price}
              </p>

              <p className="mt-4 text-cyan-300">
                AI Score: {product.ai_score || "N/A"}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}