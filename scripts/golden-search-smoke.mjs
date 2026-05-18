const BASE_URL = process.env.SEARCH_BASE_URL || "http://localhost:3000";
const QUERIES = [
  "iphone 16",
  "iphone 16 case",
  "airpods",
  "airpods case",
  "sofa",
  "adidas samba",
  "gaming monitor",
  "ايفون 16 رخيص",
  "افضل سماعات ايربودز مستعملة",
  "كنبة زاوية رخيصة في هولندا",
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
    errorState: meta.errorState ?? json?.error ?? null,
  };
}

const rows = [];
for (const query of QUERIES) {
  rows.push(await postSearch(query));
}

for (const row of rows) {
  console.log(
    `${row.query}: status=${row.status} success=${row.success} products=${row.products} sources=${row.sourceCount} category=${row.canonicalCategory ?? "unknown"} language=${row.canonicalLanguage ?? "unknown"} fallback=${row.fallbackReason ?? "none"} error=${row.errorState ?? "none"}`
  );
}

const failures = rows.filter((row) => !row.canonicalCategory);
if (failures.length > 0) {
  process.exitCode = 1;
}
