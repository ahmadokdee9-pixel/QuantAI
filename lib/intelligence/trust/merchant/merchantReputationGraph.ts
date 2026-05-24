/**
 * Phase 5 — Merchant reputation graph (tray-local, deterministic).
 */

import type { QuantProduct } from "@/lib/shoppingScore";
import type { MerchantTrustProfile } from "../types";
import {
  trackMerchantConsistency,
  type MerchantConsistencySnapshot,
} from "./merchantConsistencyTracker";
import {
  detectSuspiciousSellers,
  type SuspiciousSellerVerdict,
} from "./suspiciousSellerDetector";
import { getStoreTrustScore } from "@/lib/retailTrust";

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export type MerchantReputationGraph = {
  version: string;
  nodes: MerchantTrustProfile[];
  edgeCount: number;
  alertCount: number;
};

function warehouseConfidence(listings: QuantProduct[]): number {
  const blob = listings
    .map((p) => `${p.store} ${p.availability ?? ""}`)
    .join(" ")
    .toLowerCase();
  let c = 0.72;
  if (/\bmarketplace|third[-\s]?party|reseller\b/.test(blob)) c -= 0.2;
  if (/\bwarehouse|fulfillment\b/.test(blob)) c += 0.05;
  return round4(Math.min(1, Math.max(0, c)));
}

function shippingInconsistency(listings: QuantProduct[]): number {
  const patterns = listings.map((p) =>
    /free shipping|ships in \d|delivery \d|pickup only/i.test(
      `${p.shipping ?? ""} ${p.title}`
    )
      ? 1
      : 0
  );
  const mixed = new Set(patterns).size > 1;
  return mixed ? 0.55 : 0.12;
}

export function buildMerchantReputationGraph(
  products: QuantProduct[]
): MerchantReputationGraph {
  const consistency = trackMerchantConsistency(products);
  const suspicious = detectSuspiciousSellers(products, consistency);
  const byStore = new Map<string, QuantProduct[]>();
  for (const p of products) {
    const k = p.store.trim().toLowerCase();
    const list = byStore.get(k) ?? [];
    list.push(p);
    byStore.set(k, list);
  }

  const suspByStore = new Map(suspicious.map((s) => [s.storeKey, s]));
  const nodes: MerchantTrustProfile[] = [];

  for (const snap of consistency) {
    const listings = byStore.get(snap.storeKey) ?? [];
    const susp = suspByStore.get(snap.storeKey);
    const baseTrust = listings.length
      ? listings.reduce((s, p) => s + getStoreTrustScore(p.store), 0) / listings.length
      : 50;
    const reasons = [...snap.reasons, ...(susp?.reasons ?? [])];
    const alert = susp?.suspicious === true;

    nodes.push({
      storeKey: snap.storeKey,
      reputationScore: round4(baseTrust),
      consistencyScore: snap.consistencyScore,
      catalogQuality01: snap.titleQuality01,
      fakeInventoryRisk01: susp?.fakeInventoryRisk01 ?? 0,
      duplicateIdentityRisk01: susp?.duplicateIdentityRisk01 ?? 0,
      suspiciousPricing01: round4(Math.min(1, snap.priceSpreadRatio)),
      shippingInconsistency01: shippingInconsistency(listings),
      warehouseConfidence01: warehouseConfidence(listings),
      alert,
      reasons,
    });
  }

  return {
    version: "phase5",
    nodes,
    edgeCount: nodes.length > 1 ? nodes.length - 1 : 0,
    alertCount: nodes.filter((n) => n.alert).length,
  };
}
