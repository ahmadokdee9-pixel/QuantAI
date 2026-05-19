/** Probe specific production queries with spacing — avoids 429 burst false negatives. */
const BASE = process.env.SEARCH_BASE_URL || "https://quant-ai-app.vercel.app";
const QUERIES = [
  "nike shoes like vomero but cheaper",
  "جزمة مثل nike vomero بس ارخص",
  "كرسي office minimal",
  "كرسي مكتب مريح وفخم",
  "yves saint laurent libre edp 90ml",
  "minimal desk setup",
  "كنبة زاوية",
  "ايفون 16 رخيص",
  "سماعات ايربودز",
  "robot vacuum under 400",
  "ساعة شكلها luxury بس سعرها معقول",
];

async function search(query) {
  const res = await fetch(`${BASE}/api/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  const json = await res.json().catch(() => ({}));
  const products = json?.data?.products ?? [];
  const meta = json?.data?.meta ?? {};
  const cq = meta.canonicalQuery ?? {};
  return {
    status: res.status,
    count: products.length,
    category: cq.category ?? null,
    primary: cq.intent?.primary ?? null,
    mode: cq.marketMode ?? null,
    top: (products[0]?.title ?? "").slice(0, 80),
  };
}

for (const q of QUERIES) {
  const r = await search(q);
  console.log(JSON.stringify({ q: q.slice(0, 50), ...r }));
  await new Promise((x) => setTimeout(x, 2500));
}
