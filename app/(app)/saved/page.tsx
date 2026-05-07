import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/app/api/search/lib/supabaseAdmin";

export default async function SavedProductsPage() {
  try {
    const { userId } = await auth();

    const { data, error } = await supabaseAdmin
      .from("saved_products")
      .select("*")
      .limit(5);

    return (
      <div className="p-10 text-white">
        <h1 className="text-3xl font-bold">Saved Debug</h1>

        <p className="mt-4">User ID: {userId || "No user"}</p>

        <h2 className="mt-6 text-xl font-bold">Supabase Error:</h2>
        <pre className="mt-2 whitespace-pre-wrap text-red-300">
          {error ? JSON.stringify(error, null, 2) : "No error"}
        </pre>

        <h2 className="mt-6 text-xl font-bold">Data:</h2>
        <pre className="mt-2 whitespace-pre-wrap text-gray-300">
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
    );
  } catch (err: any) {
    return (
      <div className="p-10 text-white">
        <h1 className="text-3xl font-bold text-red-300">Server Error</h1>
        <pre className="mt-4 whitespace-pre-wrap text-red-300">
          {err?.message || JSON.stringify(err, null, 2)}
        </pre>
      </div>
    );
  }
}