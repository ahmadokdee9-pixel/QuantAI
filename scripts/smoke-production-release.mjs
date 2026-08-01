/**
 * Production smoke after Vercel deploy.
 * Usage: node scripts/smoke-production-release.mjs [baseUrl]
 */
const base = (process.argv[2] || "https://www.quantaihq.com").replace(/\/$/, "");
let failed = 0;

function pass(m) {
  console.log(`[PASS] ${m}`);
}
function fail(m) {
  failed += 1;
  console.error(`[FAIL] ${m}`);
}

async function json(path, init) {
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      "X-Requested-With": "quantai-web",
      ...(init?.headers || {}),
    },
  });
  const text = await res.text();
  let body = null;
  try {
    body = JSON.parse(text);
  } catch {
    /* ignore */
  }
  return { res, body, text };
}

console.log(`Production smoke: ${base}\n`);

const home = await fetch(base);
if (home.ok) pass(`GET / ${home.status}`);
else fail(`GET / ${home.status}`);

for (const path of ["/decisions", "/watchlist", "/api/health"]) {
  const res = await fetch(`${base}${path}`, { redirect: "manual" });
  const clerkReason = res.headers.get("x-clerk-auth-reason") || "";
  // Signed-out users: Clerk may 302 to sign-in or protect-rewrite to 404 on custom domains.
  if (
    res.ok ||
    res.status === 307 ||
    res.status === 302 ||
    res.status === 308 ||
    (res.status === 404 && clerkReason.includes("protect-rewrite"))
  ) {
    pass(`GET ${path} ${res.status}${clerkReason ? ` (${clerkReason})` : ""}`);
  } else fail(`GET ${path} ${res.status}`);
}

const classify = await json("/api/decision/classify", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ query: "flight Amsterdam to Istanbul next Friday" }),
});
if (classify.res.ok && classify.body?.classification?.domain === "flight") {
  pass("POST /api/decision/classify → flight");
} else {
  fail(`classify ${classify.res.status} ${JSON.stringify(classify.body).slice(0, 160)}`);
}

const hotel = await json("/api/decision/run", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    query: "hotel in Paris near the Louvre for 3 nights",
    forcedDomain: "hotel",
  }),
});
const hotelN = hotel.body?.decision?.candidates?.length ?? 0;
if (hotel.res.ok && hotel.body?.decision && hotelN > 0) {
  pass(`POST /api/decision/run hotel candidates=${hotelN} action=${hotel.body.decision.action}`);
} else {
  fail(`hotel run ${hotel.res.status} n=${hotelN} ${String(hotel.body?.decision?.executiveSummary || "").slice(0, 120)}`);
}

const flight = await json("/api/decision/run", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    query: "flight Amsterdam to Istanbul next Friday",
    forcedDomain: "flight",
  }),
});
const flightN = flight.body?.decision?.candidates?.length ?? 0;
if (flight.res.ok && flight.body?.decision && flightN > 0) {
  pass(`POST /api/decision/run flight candidates=${flightN} action=${flight.body.decision.action}`);
} else {
  fail(`flight run ${flight.res.status} n=${flightN}`);
}

const sub = await json("/api/decision/run", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    query: "is Adobe Creative Cloud worth it for me?",
    forcedDomain: "subscription",
  }),
});
if (sub.res.ok && sub.body?.decision) {
  pass(
    `POST /api/decision/run subscription action=${sub.body.decision.action} provider=${sub.body.decision.providerStatus}`
  );
} else fail(`subscription run ${sub.res.status}`);

const search = await json("/api/search", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ query: "noise cancelling headphones under 150" }),
});
const products =
  search.body?.products ||
  search.body?.data?.products ||
  (Array.isArray(search.body?.items) ? search.body.items : null);
const count = Array.isArray(products)
  ? products.length
  : typeof search.body?.meta === "object"
    ? "meta"
    : 0;
if (search.res.ok) pass(`POST /api/search ok products=${count}`);
else fail(`search ${search.res.status}`);

const domains = await json("/api/decision/run");
if (domains.res.ok && domains.body?.domains?.live?.includes("product")) {
  pass(`GET /api/decision/run live=${domains.body.domains.live.join(",")}`);
} else fail("GET /api/decision/run domains");

if (failed) {
  console.error(`\n${failed} production smoke failure(s)`);
  process.exit(1);
}
console.log("\nProduction smoke green.");
