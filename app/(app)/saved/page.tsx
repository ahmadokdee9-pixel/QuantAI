import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/app/api/search/lib/supabaseAdmin";

export default async function SavedProductsPage() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return (
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-white">
          <h1 className="text-3xl font-bold">Saved Products</h1>
          <p className="mt-3 text-gray-400">You are not signed in.</p>
        </div>
      );
    }

    const { data, error } = await supabaseAdmin
      .from("saved_products")
      .select("*")
      .eq("user_id", userId);

    if (error) {
      return (
        <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-8 text-white">
          <h1 className="text-3xl font-bold">Supabase Error</h1>
          <pre className="mt-4 whitespace-pre-wrap text-sm text-red-200">
            {JSON.stringify(error, null, 2)}
          </pre>
        </div>
      );
    }

    return (
      <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-white">
        <h1 className="text-3xl font-bold">Saved Products</h1>
        <p className="mt-3 text-gray-400">
          Found {data?.length || 0} saved products.
        </p>

        <pre className="mt-6 whitespace-pre-wrap text-xs text-gray-300">
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
    );
  } catch (err: any) {
    return (
      <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-8 text-white">
        <h1 className="text-3xl font-bold">Server Error</h1>
        <pre className="mt-4 whitespace-pre-wrap text-sm text-red-200">
          {err?.message || JSON.stringify(err, null, 2)}
        </pre>
      </div>
    );
  }
}