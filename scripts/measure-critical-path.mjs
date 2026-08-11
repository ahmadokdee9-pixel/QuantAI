/**
 * Measure homepage critical-path asset weight (HTML + preloaded fonts/CSS + script src).
 * Usage: node scripts/measure-critical-path.mjs [baseUrl]
 */
const base = process.argv[2] || "https://www.quantaihq.com";

function makeJar() {
  const jar = new Map();
  return {
    store(res) {
      const raw =
        typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
      for (const c of raw) {
        const [nv] = c.split(";");
        const i = nv.indexOf("=");
        if (i > 0) jar.set(nv.slice(0, i).trim(), nv.slice(i + 1));
      }
    },
    header() {
      return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
    },
  };
}

async function fetchHtml(url) {
  const jar = makeJar();
  let current = url;
  for (let i = 0; i < 10; i++) {
    const r = await fetch(current, {
      redirect: "manual",
      cache: "no-store",
      headers: {
        accept: "text/html,application/xhtml+xml",
        "cache-control": "no-cache",
        "user-agent": "QuantAI-CriticalPath/1.0",
        ...(jar.header() ? { cookie: jar.header() } : {}),
      },
    });
    jar.store(r);
    if (r.status >= 301 && r.status <= 308) {
      const loc = r.headers.get("location");
      if (!loc) throw new Error(`Redirect without location from ${current}`);
      current = new URL(loc, current).href;
      continue;
    }
    return { r, html: await r.text() };
  }
  throw new Error("Too many redirects fetching HTML");
}

const { html } = await fetchHtml(base + "/");
const preloads = [...html.matchAll(/<link[^>]+>/gi)]
  .map((m) => m[0])
  .filter((x) => /preload|font|stylesheet/i.test(x));
const hrefs = preloads
  .map((l) => {
    const m = l.match(/href="([^"]+)"/);
    return m?.[1];
  })
  .filter(Boolean);
const scripts = [...html.matchAll(/src="(\/_next\/static\/[^"]+)"/g)].map((m) => m[1]);
const paths = [...new Set([...hrefs, ...scripts])];

const sizes = [];
for (const p of paths) {
  const u = p.startsWith("http") ? p : base + p;
  const h = await fetch(u, { cache: "no-store" });
  const buf = Buffer.from(await h.arrayBuffer());
  sizes.push({
    bytes: buf.length,
    enc: h.headers.get("content-encoding"),
    p: p.replace(base, "").slice(0, 120),
    kind: /\.woff2|\.woff|\.ttf/i.test(p)
      ? "font"
      : /\.css/i.test(p)
        ? "css"
        : /\.js/i.test(p)
          ? "js"
          : "other",
  });
}
sizes.sort((a, b) => b.bytes - a.bytes);

const byKind = { font: 0, css: 0, js: 0, other: 0, html: html.length };
for (const s of sizes) byKind[s.kind] += s.bytes;

const arabicFont = sizes.filter(
  (s) =>
    s.kind === "font" &&
    (/arabic|plex|280fac|ceec3e|c9a0d3|5ad8fd/i.test(s.p) || /IBM/i.test(html) && s.kind === "font")
);
// Heuristic: all non-Geist font files referenced from homepage HTML
const geistOnly = sizes.filter((s) => s.kind === "font" && /Geist/i.test(s.p));
const nonGeistFonts = sizes.filter((s) => s.kind === "font" && !/Geist/i.test(s.p));

const out = {
  base,
  htmlBytes: html.length,
  assetCount: sizes.length,
  byKind,
  totalAssets: sizes.reduce((a, s) => a + s.bytes, 0),
  criticalTotal: html.length + sizes.reduce((a, s) => a + s.bytes, 0),
  nonGeistFontBytes: nonGeistFonts.reduce((a, s) => a + s.bytes, 0),
  geistFontBytes: geistOnly.reduce((a, s) => a + s.bytes, 0),
  arabicInCssStack: /font-quantai-ar|IBM_Plex|Plex_Sans_Arabic/i.test(html),
  top: sizes.slice(0, 20),
  nonGeistFonts,
};
console.log(JSON.stringify(out, null, 2));
