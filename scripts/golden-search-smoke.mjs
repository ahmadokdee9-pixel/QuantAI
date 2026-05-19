/**
 * Golden-query smoke — ranking consistency and tray health.
 * Usage: SEARCH_BASE_URL=https://quant-ai-app.vercel.app npm run test:golden-search
 */
const BASE_URL = process.env.SEARCH_BASE_URL || "http://localhost:3000";
const MIN_PRODUCTS_DEFAULT = Number(process.env.GOLDEN_MIN_PRODUCTS || "3");

/** Queries that must return a populated tray in production-like environments. */
const QUERIES = [
  { query: "iphone 16", minProducts: 5 },
  { query: "airpods", minProducts: 5 },
  { query: "gaming monitor", minProducts: 3 },
  { query: "adidas samba", minProducts: 3 },
  { query: "sofa", minProducts: 3 },
  { query: "iphone 16 case", minProducts: 3 },
  { query: "best premium headphones for focus", minProducts: 3 },
  { query: "gaming monitor for PS5 under 500", minProducts: 3 },
  { query: "minimal white sneakers like Common Projects", minProducts: 2 },
  { query: "iphone 15 pro max titanium", minProducts: 4 },
  { query: "iphone 15 برو max titanium", minProducts: 3 },
  { query: "كرسي office minimal", minProducts: 2 },
  { query: "luxury ساعة under 300", minProducts: 2 },
  { query: "جزمة مثل nike vomero بس ارخص", minProducts: 2 },
  { query: "cheap but luxury looking sofa", minProducts: 3 },
  { query: "compare airpods pro vs airpods 4", minProducts: 3 },
  { query: "كنبة زاوية", minProducts: 2 },
  { query: "ايفون 16 رخيص", minProducts: 2 },
  { query: "سماعات ايربودز", minProducts: 2 },
];

async function postSearch(query) {
  const response = await fetch(`${BASE_URL}/api/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  const contentType = response.headers.get("content-type") || "";
  const text = await response.text();
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new Error(`${query}: expected JSON, got ${response.status} ${contentType}`);
  }
  let json;
  try {
    json = JSON.parse(text);
  } catch (error) {
    throw new Error(`${query}: invalid JSON body (${error instanceof Error ? error.message : "unknown"})`);
  }
  const products = Array.isArray(json?.data?.products) ? json.data.products : [];
  const meta = json?.data?.meta && typeof json.data.meta === "object" ? json.data.meta : {};
  return {
    query,
    status: response.status,
    success: json?.success === true,
    products: products.length,
    sourceCount: meta.sourceCount ?? 0,
    canonicalCategory: meta.canonicalQuery?.category ?? null,
    canonicalLanguage: meta.canonicalQuery?.language ?? null,
    fallbackReason: meta.fallbackReason ?? null,
    trayExplanation: meta.trayExplanation ?? null,
    errorState: meta.errorState ?? json?.error ?? null,
  };
}

const rows = [];
for (const spec of QUERIES) {
  rows.push({ ...(await postSearch(spec.query)), minProducts: spec.minProducts ?? MIN_PRODUCTS_DEFAULT });
}

for (const row of rows) {
  console.log(
    `${row.query}: status=${row.status} success=${row.success} products=${row.products} (min ${row.minProducts}) sources=${row.sourceCount} category=${row.canonicalCategory ?? "unknown"} language=${row.canonicalLanguage ?? "unknown"} fallback=${row.fallbackReason ?? "none"} error=${row.errorState ?? "none"}`
  );
  if (row.trayExplanation && row.products === 0) {
    console.log(`  tray: ${row.trayExplanation}`);
  }
}

const failures = rows.filter((row) => {
  if (!row.success || row.status !== 200) return true;
  if (!row.canonicalCategory) return true;
  if (row.products < row.minProducts) return true;
  return false;
});

if (failures.length > 0) {
  console.error(`\n${failures.length} golden query failure(s):`);
  for (const f of failures) {
    console.error(`  - ${f.query}: products=${f.products}, category=${f.canonicalCategory ?? "missing"}`);
  }
  process.exitCode = 1;
} else {
  console.log(`\nAll ${rows.length} golden queries passed.`);
}
