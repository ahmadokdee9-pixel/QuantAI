/**
 * Tray-local fake discount & manipulation heuristics (no external price history).
 * Outputs soft probabilities for the Reality layer — not a legal claim.
 */

import { peerPriceMedianExcluding, fakeDiscountRisk } from "@/lib/deals/dealAnalysis";
import type { QuantProduct } from "@/lib/shoppingScore";
import { getStoreTrustScore } from "@/lib/shoppingScore";

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

export type FakeDiscountDetection = {
  fakeDiscountProbability: number;
  discountManipulationRisk: number;
  urgencyManipulationRisk: number;
  permanentSaleLikelihood: number;
};

function discountPct(p: QuantProduct): number | null {
  if (p.oldPrice == null || p.oldPrice <= p.price || p.price <= 0) return null;
  return Math.round(((p.oldPrice - p.price) / p.oldPrice) * 100);
}

function recycledDiscountPressure01(p: QuantProduct, list: QuantProduct[]): number {
  const d = discountPct(p);
  if (d == null || list.length < 5) return 0;
  const same = list.filter((x) => discountPct(x) === d).length;
  return clamp01((same - 1) / Math.max(4, list.length * 0.35));
}

export function detectFakeDiscountSignals(p: QuantProduct, list: QuantProduct[]): FakeDiscountDetection {
  const maxReviews = Math.max(0, ...list.map((x) => x.reviewsCount ?? 0));
  const disc = discountPct(p);
  const risk = fakeDiscountRisk(p, list, disc, maxReviews);
  const fakeP =
    risk === "high" ? 0.78 + recycledDiscountPressure01(p, list) * 0.12 : risk === "medium" ? 0.46 : 0.2;

  const peer = peerPriceMedianExcluding(list, p.link);
  const trust = getStoreTrustScore(p.store);
  const inflation = p.oldPrice != null && peer > 0 ? p.oldPrice / peer : 1;
  let manip = 0.18;
  if (inflation > 1.38) manip = 0.74;
  else if (inflation > 1.22) manip = 0.52;
  else if (inflation > 1.1) manip = 0.34;
  if (disc != null && disc >= 52 && trust < 64) manip += 0.14;
  if (disc != null && disc >= 62 && trust < 72) manip += 0.08;
  manip += recycledDiscountPressure01(p, list) * 0.22;

  const blob = `${p.availability ?? ""} ${p.title} ${p.extensions.join(" ")}`.toLowerCase();
  let urg = /limited|low stock|only \d|few left|almost gone|hurry|ends (today|tonight)|last chance|flash|countdown|while supplies last/i.test(
    blob
  )
    ? 0.58
    : 0.16;
  if ((p.reviewsCount ?? 0) < 10 && urg > 0.35) urg += 0.12;

  let permanent =
    /\b(sale|clearance|\d{1,2}%\s*off|mega deal|doorbuster)\b/i.test(blob) && disc != null && disc >= 28 ? 0.38 : 0.12;
  if (recycledDiscountPressure01(p, list) > 0.55) permanent += 0.18;

  if (/\b(fruugo|ubuy|wish|temu|aliexpress|dhgate|banggood)\b/i.test(`${p.store} ${p.title}`) && disc != null && disc >= 30) {
    manip += disc >= 40 ? 0.24 : 0.16;
    if (trust < 66) manip += 0.1;
  }

  return {
    fakeDiscountProbability: clamp01(fakeP),
    discountManipulationRisk: clamp01(manip),
    urgencyManipulationRisk: clamp01(urg),
    permanentSaleLikelihood: clamp01(permanent),
  };
}
