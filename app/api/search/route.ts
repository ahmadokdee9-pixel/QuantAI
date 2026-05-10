import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { fetchShoppingProducts } from "./lib/fetchShopping";
import { enforceLimit, searchRatelimit } from "@/lib/rate-limit";

async function handleSearch(q: string | null | undefined) {
  const query = q?.trim();
  if (!query) {
    return NextResponse.json({ error: "Missing query" }, { status: 400 });
  }

  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { error: "Sign in to run a product search." },
      { status: 401 }
    );
  }

  const limited = await enforceLimit(searchRatelimit, userId);
  if (!limited.ok) {
    return NextResponse.json(
      {
        error: "Too many searches. Try again later.",
        retryAfter: limited.retryAfter,
      },
      { status: 429, headers: { "Retry-After": String(limited.retryAfter) } }
    );
  }

  const result = await fetchShoppingProducts(query);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ products: result.products });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");
  return handleSearch(q);
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { query?: string; q?: string };
    const q = body.query ?? body.q ?? null;
    return handleSearch(q);
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
}
