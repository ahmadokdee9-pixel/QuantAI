#!/usr/bin/env node
/**
 * Generates QUANTAI_FULL_ARCHITECTURE_AUDIT.pdf from the markdown source.
 * Usage: node scripts/generate-architecture-audit-pdf.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "docs", "architecture-audit");
const MD_PATH = path.join(OUT_DIR, "QUANTAI_FULL_ARCHITECTURE_AUDIT.md");
const PDF_PATH = path.join(OUT_DIR, "QUANTAI_FULL_ARCHITECTURE_AUDIT.pdf");
const DEPS_DIR = path.join(OUT_DIR, ".pdf-gen");

function ensureDeps() {
  const marker = path.join(DEPS_DIR, "node_modules", "puppeteer");
  if (fs.existsSync(marker)) return;
  fs.mkdirSync(DEPS_DIR, { recursive: true });
  if (!fs.existsSync(path.join(DEPS_DIR, "package.json"))) {
    fs.writeFileSync(
      path.join(DEPS_DIR, "package.json"),
      JSON.stringify({ name: "quantai-pdf-gen", private: true, type: "module" }, null, 2),
    );
  }
  console.log("Installing PDF generation dependencies (marked, puppeteer, pdf-parse)...");
  execSync("npm install marked puppeteer pdf-parse --no-audit --no-fund --loglevel=error", {
    cwd: DEPS_DIR,
    stdio: "inherit",
  });
}

function stripFrontMatter(md) {
  if (md.startsWith("---")) {
    const end = md.indexOf("---", 3);
    if (end !== -1) return md.slice(end + 3).trimStart();
  }
  return md;
}

function stripMarkdownToc(md) {
  const tocStart = md.indexOf("## Table of Contents");
  if (tocStart === -1) return md;
  const afterToc = md.indexOf("\n---\n", tocStart);
  if (afterToc === -1) return md;
  return md.slice(0, tocStart).trimEnd() + "\n\n" + md.slice(afterToc + 5).trimStart();
}

function buildTocHtml(headings) {
  const items = headings
    .filter((h) => h.level <= 2)
    .map(
      (h) =>
        `<li class="toc-l${h.level}"><a href="#${h.id}">${escapeHtml(h.text)}</a></li>`,
    )
    .join("\n");
  return `<nav class="toc-page"><h2>Table of Contents</h2><ol class="toc-list">${items}</ol></nav>`;
}

function escapeHtml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

function extractHeadings(html) {
  const headings = [];
  const re = /<h([1-6]) id="([^"]+)">([^<]+)<\/h[1-6]>/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    headings.push({ level: Number(m[1]), id: m[2], text: m[3] });
  }
  return headings;
}

function wrapMermaidBlocks(html) {
  return html.replace(
    /<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g,
    (_match, code) =>
      `<div class="diagram-block mermaid-diagram"><div class="diagram-label">Architecture Diagram (Mermaid)</div><pre class="diagram-source">${escapeHtml(decodeEntities(code.trim()))}</pre></div>`,
  );
}

function decodeEntities(s) {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"');
}

function addHeadingIds(html) {
  return html.replace(/<h([1-6])>([^<]+)<\/h[1-6]>/g, (_match, level, text) => {
    const id = slugify(text);
    return `<h${level} id="${id}">${text}</h${level}>`;
  });
}

const CSS = `
@page {
  size: A4;
  margin: 22mm 18mm 24mm 18mm;
  @bottom-center {
    content: counter(page);
    font-family: "Segoe UI", system-ui, sans-serif;
    font-size: 9pt;
    color: #64748b;
  }
}

@page :first {
  margin: 0;
  @bottom-center { content: none; }
}

* { box-sizing: border-box; }

body {
  font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif;
  font-size: 10.5pt;
  line-height: 1.55;
  color: #0f172a;
  background: #ffffff;
  margin: 0;
  padding: 0;
}

.title-page {
  page-break-after: always;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  background: linear-gradient(180deg, #f8fafc 0%, #ffffff 45%, #f1f5f9 100%);
  border-bottom: 4px solid #1e40af;
  padding: 48px 40px;
}

.title-page .org {
  font-size: 11pt;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #475569;
  margin-bottom: 28px;
}

.title-page h1 {
  font-size: 28pt;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 12px;
  line-height: 1.15;
  max-width: 90%;
}

.title-page .subtitle {
  font-size: 14pt;
  color: #334155;
  margin: 0 0 36px;
  font-weight: 400;
}

.title-page .meta {
  font-size: 10.5pt;
  color: #64748b;
  line-height: 1.8;
}

.title-page .classification {
  margin-top: 48px;
  padding: 10px 18px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 9.5pt;
  color: #475569;
  background: #ffffff;
}

.toc-page {
  page-break-after: always;
  padding-top: 8px;
}

.toc-page h2 {
  font-size: 18pt;
  border-bottom: 2px solid #1e40af;
  padding-bottom: 8px;
  margin-top: 0;
}

.toc-list {
  list-style: none;
  padding: 0;
  margin: 20px 0 0;
}

.toc-list li {
  margin: 6px 0;
  line-height: 1.4;
}

.toc-list a {
  color: #1e40af;
  text-decoration: none;
}

.toc-l1 { font-weight: 600; margin-top: 10px; }
.toc-l2 { padding-left: 18px; font-size: 10pt; }

.content {
  max-width: 100%;
}

h1, h2, h3, h4 {
  color: #0f172a;
  page-break-after: avoid;
}

h1 {
  font-size: 20pt;
  border-bottom: 2px solid #1e40af;
  padding-bottom: 6px;
  margin-top: 28px;
}

h2 {
  font-size: 15pt;
  border-bottom: 1px solid #cbd5e1;
  padding-bottom: 4px;
  margin-top: 24px;
}

h3 {
  font-size: 12pt;
  margin-top: 18px;
  color: #1e293b;
}

h4 {
  font-size: 11pt;
  margin-top: 14px;
}

p { margin: 8px 0 10px; }

strong { color: #0f172a; }

ul, ol {
  margin: 8px 0 12px;
  padding-left: 22px;
}

li { margin: 4px 0; }

hr {
  border: none;
  border-top: 1px solid #e2e8f0;
  margin: 20px 0;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin: 14px 0 18px;
  font-size: 9.5pt;
  page-break-inside: avoid;
}

thead th {
  background: #1e40af;
  color: #ffffff;
  font-weight: 600;
  text-align: left;
  padding: 8px 10px;
}

tbody td {
  border: 1px solid #cbd5e1;
  padding: 7px 10px;
  vertical-align: top;
}

tbody tr:nth-child(even) td {
  background: #f8fafc;
}

code {
  font-family: "Cascadia Code", "Consolas", "Courier New", monospace;
  font-size: 9pt;
  background: #f1f5f9;
  padding: 1px 5px;
  border-radius: 3px;
  color: #0f172a;
}

pre {
  font-family: "Cascadia Code", "Consolas", "Courier New", monospace;
  font-size: 8.5pt;
  line-height: 1.45;
  background: #0f172a;
  color: #e2e8f0;
  padding: 14px 16px;
  border-radius: 6px;
  overflow-x: auto;
  page-break-inside: avoid;
  border: 1px solid #334155;
  margin: 12px 0 16px;
}

pre code {
  background: transparent;
  padding: 0;
  color: inherit;
  font-size: inherit;
}

.diagram-block {
  margin: 14px 0 18px;
  page-break-inside: avoid;
  border: 1px solid #94a3b8;
  border-radius: 6px;
  overflow: hidden;
}

.diagram-label {
  background: #1e40af;
  color: #ffffff;
  font-size: 8.5pt;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 6px 12px;
}

.diagram-source {
  background: #1e293b;
  color: #cbd5e1;
  margin: 0;
  border: none;
  border-radius: 0;
  white-space: pre-wrap;
  word-break: break-word;
}

blockquote {
  border-left: 4px solid #1e40af;
  margin: 12px 0;
  padding: 8px 16px;
  background: #f8fafc;
  color: #334155;
}

a { color: #1e40af; }

.footer-note {
  margin-top: 32px;
  padding-top: 12px;
  border-top: 1px solid #e2e8f0;
  font-size: 9pt;
  color: #64748b;
  font-style: italic;
}
`;

async function main() {
  if (!fs.existsSync(MD_PATH)) {
    console.error(`ERROR: Markdown not found at ${MD_PATH}`);
    process.exit(1);
  }

  ensureDeps();

  const markedPath = path.join(DEPS_DIR, "node_modules", "marked", "lib", "marked.esm.js");
  const puppeteerPath = path.join(DEPS_DIR, "node_modules", "puppeteer", "lib", "puppeteer", "puppeteer.js");
  const pdfParsePath = path.join(DEPS_DIR, "node_modules", "pdf-parse", "dist", "pdf-parse", "esm", "index.js");

  const { marked } = await import(pathToFileURL(markedPath).href);
  const puppeteer = await import(pathToFileURL(puppeteerPath).href);
  const { PDFParse } = await import(pathToFileURL(pdfParsePath).href);

  marked.setOptions({
    gfm: true,
    breaks: false,
  });

  const rawMd = fs.readFileSync(MD_PATH, "utf8");
  const mdBody = stripMarkdownToc(stripFrontMatter(rawMd));

  let bodyHtml = marked.parse(mdBody);
  bodyHtml = addHeadingIds(bodyHtml);
  bodyHtml = wrapMermaidBlocks(bodyHtml);

  const headings = extractHeadings(bodyHtml);

  const titlePage = `
<section class="title-page">
  <div class="org">Smartbuy · QuantAI</div>
  <h1>QuantAI Full Architecture Audit</h1>
  <p class="subtitle">Pre–Phase 7 Complete System Assessment</p>
  <div class="meta">
    <div><strong>Date:</strong> May 2026</div>
    <div><strong>Scope:</strong> P4.8–P6.9 controlled layers, search integration, CI harness</div>
    <div><strong>Method:</strong> Read-only codebase audit</div>
    <div><strong>Version:</strong> 1.0</div>
  </div>
  <div class="classification">Internal — Architecture &amp; Engineering</div>
</section>`;

  const tocHtml = buildTocHtml(headings);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>QuantAI Full Architecture Audit</title>
  <style>${CSS}</style>
</head>
<body>
${titlePage}
${tocHtml}
<main class="content">
${bodyHtml}
</main>
</body>
</html>`;

  const htmlPath = path.join(OUT_DIR, "QUANTAI_FULL_ARCHITECTURE_AUDIT.html");
  fs.writeFileSync(htmlPath, html, "utf8");

  console.log("Launching headless browser for PDF rendering...");
  const browser = await puppeteer.default.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    await page.pdf({
      path: PDF_PATH,
      format: "A4",
      printBackground: true,
      displayHeaderFooter: false,
      margin: { top: "22mm", right: "18mm", bottom: "24mm", left: "18mm" },
    });
  } finally {
    await browser.close();
  }

  const pdfBuffer = fs.readFileSync(PDF_PATH);
  const parser = new PDFParse({ data: pdfBuffer });
  const info = await parser.getInfo();
  const totalPages = info.total;
  await parser.destroy();

  const result = {
    success: true,
    totalPages,
    files: {
      markdown: MD_PATH,
      pdf: PDF_PATH,
      html: htmlPath,
    },
  };

  console.log("\n=== QuantAI Architecture Audit Export ===");
  console.log(`Generation status: SUCCESS`);
  console.log(`Total pages:       ${totalPages}`);
  console.log(`Markdown:          ${MD_PATH}`);
  console.log(`PDF:               ${PDF_PATH}`);
  console.log(`HTML (intermediate): ${htmlPath}`);
  console.log("=========================================\n");

  return result;
}

main().catch((err) => {
  console.error("PDF generation failed:", err);
  process.exit(1);
});
