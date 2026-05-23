#!/usr/bin/env node
/**
 * Stage 1 variant boundary diagnostic — iphone / nike / airpods only.
 * Usage: SEARCH_BASE_URL=https://quant-ai-app.vercel.app npm run stage1-variant-boundary-probe
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import {
  normalizeCommerceProductTray,
  equivalenceGroupHasVariantBoundaryViolation,
  extractVariantAxes,
  variantBoundaryConflict,
} from "../lib/intelligence/normalization/index.ts";
import { extractModelTierKey } from "../lib/intelligence/normalization/variantBoundary.ts";

const BASE_URL = process.env.SEARCH_BASE_URL || "https://quant-ai-app.vercel.app";
const FOCUS = [
  { id: "iphone-15-pro", query: "iphone 15 pro max" },
  { id: "nike-af1", query: "nike air force 1 white" },
  { id: "airpods", query: "airpods pro 2" },
];

const OUT_DIR = join(process.cwd(), "docs", "architecture-audit", "stage1-shadow", "samples");

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchTray(query) {
  const url = `${BASE_URL.replace(/\/$/, "")}/api/search?q=${encodeURIComponent(query)}`;
  const res = await fetch(url);
  const body = await res.json();
  return body?.data?.products ?? [];
}

function analyzeOffline(tray, query) {
  process.env.QUANTAI_NORMALIZATION_ENABLED = "true";
  process.env.QUANTAI_NORMALIZATION_MODE = "shadow";
  process.env.QUANTAI_NORMALIZATION_APPLY = "false";
  process.env.QUANTAI_NORMALIZATION_SHADOW_TELEMETRY = "true";

  const { products, meta } = normalizeCommerceProductTray(tray, query);
  const groupReports = [];

  for (const group of meta.groups) {
    if (group.memberLinks.length < 2) continue;
    const check = equivalenceGroupHasVariantBoundaryViolation(products, group.memberLinks);
    const members = group.memberLinks.map((link) => {
      const p = products.find((x) => x.link === link);
      const axes = p ? extractVariantAxes(p) : null;
      return {
        link,
        title: p?.title?.slice(0, 80) ?? null,
        store: p?.store ?? null,
        price: p?.price ?? null,
        variantKey: p?.qiNormalizedCommerce?.variantKey ?? null,
        modelTierKey: axes?.modelTierKey ?? (p ? extractModelTierKey(`${p.title} ${p.extensions?.join(" ") ?? ""}`) : null),
        storageGb: axes?.storageGb ?? null,
        colorKey: axes?.colorKey ?? null,
        sizeKey: axes?.sizeKey ?? null,
        condition: axes?.condition ?? null,
      };
    });
    groupReports.push({
      equivalenceClassId: group.equivalenceClassId,
      memberCount: group.memberLinks.length,
      boundaryViolation: check.violation,
      violationReasons: check.reasons,
      conflictPairs: check.pairs,
      members,
    });
  }

  return {
    inputCount: meta.inputCount,
    outputCount: meta.outputCount,
    equivalenceGroupCount: meta.equivalenceGroupCount,
    falseCollapseIncidents: meta.groups.filter((g) => {
      if (g.memberLinks.length < 2) return false;
      return equivalenceGroupHasVariantBoundaryViolation(products, g.memberLinks).violation;
    }).length,
    multiVariantKeyGroups: meta.groups.filter((g) => {
      if (g.memberLinks.length < 2) return false;
      const keys = new Set(
        g.memberLinks
          .map((l) => products.find((p) => p.link === l)?.qiNormalizedCommerce?.variantKey)
          .filter(Boolean)
      );
      return keys.size > 1;
    }).length,
    groups: groupReports.filter((g) => g.boundaryViolation || g.memberCount >= 2),
  };
}

const report = { generatedAt: new Date().toISOString(), baseUrl: BASE_URL, queries: [] };

for (let i = 0; i < FOCUS.length; i++) {
  const spec = FOCUS[i];
  console.log(`\n=== ${spec.id} ===`);
  try {
    const tray = await fetchTray(spec.query);
    const analysis = analyzeOffline(tray, spec.query);
    report.queries.push({ id: spec.id, query: spec.query, productCount: tray.length, ...analysis });

    console.log(`products=${tray.length} groups=${analysis.equivalenceGroupCount}`);
    console.log(
      `falseCollapseIncidents=${analysis.falseCollapseIncidents} multiVariantKeyGroups=${analysis.multiVariantKeyGroups}`
    );

    for (const g of analysis.groups.filter((x) => x.boundaryViolation)) {
      console.log(`  VIOLATION ${g.equivalenceClassId} reasons=${g.violationReasons.join(",")}`);
      for (const m of g.members) {
        console.log(
          `    - ${m.store} $${m.price} tier=${m.modelTierKey} s=${m.storageGb} c=${m.colorKey} z=${m.sizeKey} | ${m.title}`
        );
      }
    }

    if (!analysis.groups.some((x) => x.boundaryViolation)) {
      const soft = analysis.groups.filter((x) => x.memberCount >= 2 && !x.boundaryViolation);
      for (const g of soft.slice(0, 3)) {
        console.log(`  OK group (${g.memberCount} members) — variant keys may differ without axis conflict`);
        for (const m of g.members) {
          console.log(
            `    - tier=${m.modelTierKey} s=${m.storageGb} c=${m.colorKey} vk=${m.variantKey?.slice(-40)}`
          );
        }
      }
    }
  } catch (e) {
    report.queries.push({
      id: spec.id,
      query: spec.query,
      error: e instanceof Error ? e.message : String(e),
    });
    console.error("ERROR", e);
  }
  if (i < FOCUS.length - 1) await sleep(1500);
}

mkdirSync(OUT_DIR, { recursive: true });
const outPath = join(OUT_DIR, `variant-boundary-probe-${Date.now()}.json`);
writeFileSync(outPath, JSON.stringify(report, null, 2));
console.log(`\nWritten: ${outPath}`);
