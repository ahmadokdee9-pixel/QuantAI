/**
 * Ranking quality evaluation — golden queries with intent/category assertions.
 * Usage: SEARCH_BASE_URL=https://quant-ai-app.vercel.app npm run test:search-eval
 */
const BASE_URL = process.env.SEARCH_BASE_URL || "http://localhost:3000";

const CASES = [
  {
    query: "best premium headphones for focus",
    minProducts: 3,
    category: "audio",
    titleMustMatch: /headphone|earbud|airpod|bose|sony|wh-|koptelefoon/i,
  },
  {
    query: "gaming monitor for PS5 under 500",
    minProducts: 3,
    category: "electronics",
    titleMustMatch: /monitor|display|beeldscherm|scherm|hz|gaming/i,
  },
  {
    query: "minimal white sneakers like Common Projects",
    minProducts: 2,
    category: "shoes",
    titleMustMatch: /sneaker|trainer|shoe|common|achilles|leather|white/i,
  },
  {
    query: "iphone 15 pro max titanium",
    minProducts: 4,
    category: "phone",
    titleMustMatch: /iphone\s*15/i,
    titleMustNotMatch: /iphone\s*1[0-4]\b|case|cover|hoesje/i,
  },
  {
    query: "iphone 15 برو max titanium",
    minProducts: 3,
    category: "phone",
    titleMustMatch: /iphone\s*15/i,
  },
  {
    query: "كرسي office minimal",
    minProducts: 2,
    category: "furniture",
    titleMustMatch: /chair|stoel|office|desk|kantoor/i,
  },
  {
    query: "luxury ساعة under 300",
    minProducts: 2,
    category: "watch",
    titleMustMatch: /watch|smartwatch|horloge|ساعة/i,
  },
  {
    query: "جزمة مثل nike vomero بس ارخص",
    minProducts: 2,
    category: "shoes",
    titleMustMatch: /nike|vomero|shoe|sneaker|trainer|حذاء/i,
  },
  {
    query: "cheap but luxury looking sofa",
    minProducts: 3,
    category: "furniture",
    titleMustMatch: /sofa|couch|bank|sectional|hoekbank|كنبة/i,
  },
  {
    query: "compare airpods pro vs airpods 4",
    minProducts: 3,
    category: "audio",
    titleMustMatch: /airpods?/i,
  },
  {
    query: "yves saint laurent libre edp 90ml",
    minProducts: 2,
    category: "fragrance",
    titleMustMatch: /libre|yves|saint\s+laurent|parfum|edp/i,
  },
  {
    query: "nike shoes like vomero but cheaper",
    minProducts: 3,
    category: "shoes",
    titleMustMatch: /nike|vomero|shoe|sneaker|trainer/i,
  },
];

async function search(query) {
  const res = await fetch(`${BASE_URL}/api/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  const json = await res.json();
  const products = Array.isArray(json?.data?.products) ? json.data.products : [];
  const meta = json?.data?.meta ?? {};
  return { status: res.status, success: json?.success === true, products, meta };
}

function topTitles(products, n = 8) {
  return products.slice(0, n).map((p) => p.title ?? "");
}

const results = [];
for (const spec of CASES) {
  const row = { query: spec.query, ok: true, issues: [] };
  try {
    const { status, success, products, meta } = await search(spec.query);
    row.status = status;
    row.count = products.length;
    row.category = meta?.canonicalQuery?.category ?? meta?.canonicalQuery?.semantic?.productCategory ?? null;
    row.titles = topTitles(products);

    if (!success || status !== 200) row.issues.push("api_failure");
    if (products.length < spec.minProducts) row.issues.push(`low_tray_count_${products.length}`);
    if (spec.category && row.category && row.category !== spec.category) {
      row.issues.push(`category_mismatch_${row.category}`);
    }
    const top = products.slice(0, 5);
    if (spec.titleMustMatch) {
      const hits = top.filter((p) => spec.titleMustMatch.test(p.title ?? ""));
      if (hits.length < Math.min(2, top.length)) row.issues.push("weak_title_alignment");
    }
    if (spec.titleMustNotMatch) {
      const bad = top.filter((p) => spec.titleMustNotMatch.test(p.title ?? ""));
      if (bad.length >= 2) row.issues.push("contamination_in_top5");
    }
  } catch (e) {
    row.ok = false;
    row.issues.push(e instanceof Error ? e.message : "unknown_error");
  }
  row.ok = row.issues.length === 0;
  results.push(row);
}

for (const r of results) {
  const flag = r.ok ? "PASS" : "FAIL";
  console.log(`[${flag}] ${r.query}`);
  console.log(`  products=${r.count ?? 0} category=${r.category ?? "?"} issues=${r.issues.join(", ") || "none"}`);
  if (r.titles?.length) {
    for (const t of r.titles.slice(0, 3)) console.log(`    · ${t.slice(0, 90)}`);
  }
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
if (failed.length) process.exitCode = 1;
