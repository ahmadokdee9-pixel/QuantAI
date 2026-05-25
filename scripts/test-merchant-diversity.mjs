#!/usr/bin/env node
/**
 * Merchant diversity safeguard tests.
 */
import assert from "node:assert/strict";
import {
  applyMerchantDiversitySafeguard,
  normalizeMerchantKey,
  topNeedsMerchantDiversity,
  merchantCountsInTop,
} from "../lib/search/merchantDiversityRerank.ts";

function p(title, store, qiComposite, link = "https://example.com/x") {
  return { id: 1, title, store, price: 10, displayPrice: "€10", rating: 4, link, image: "", reviewsCount: 1, shipping: null, availability: null, oldPrice: null, priceTrend: "stable", extensions: [], qiComposite };
}

assert.equal(normalizeMerchantKey(p("x", "Adidas.nl", 90)), "adidas.nl");

const ikeaDominated = [
  p("Best sofa A", "ikea", 95),
  p("Best sofa B", "ikea", 94),
  p("Best sofa C", "ikea", 93),
  p("Alt sofa D", "meubels1.nl", 92),
  p("Alt sofa E", "ubuy", 91),
  p("Tail F", "bol.com", 80),
];

assert.ok(topNeedsMerchantDiversity(ikeaDominated, 5, 2));
const reranked = applyMerchantDiversitySafeguard(ikeaDominated);
const counts = merchantCountsInTop(reranked, 5);
for (const n of counts.values()) assert.ok(n <= 2, `merchant count ${n} > 2 in top5`);
assert.equal(reranked[0].store, "ikea", "rank #1 preserved");
assert.ok(
  reranked.slice(0, 5).filter((x) => x.store.toLowerCase() === "ikea").length <= 2,
  "ikea capped at 2 in top5"
);

const rank1Locked = [
  p("Samba 1", "adidas.nl", 99),
  p("Samba 2", "adidas.nl", 98),
  p("Samba 3", "adidas.nl", 97),
  p("Nike alt", "nike.com", 96),
  p("Zalando", "zalando", 95),
  p("Bol alt", "bol.com", 94),
];
const sambaOut = applyMerchantDiversitySafeguard(rank1Locked);
assert.equal(sambaOut[0].title, "Samba 1");
assert.ok(
  sambaOut.slice(0, 5).filter((x) => normalizeMerchantKey(x) === "adidas.nl").length <= 2,
  "adidas.nl capped in top5"
);
assert.ok(sambaOut.slice(0, 3).filter((x) => normalizeMerchantKey(x) === "adidas.nl").length <= 2);

const alreadyOk = [
  p("A", "a", 90),
  p("B", "b", 89),
  p("C", "c", 88),
  p("D", "d", 87),
  p("E", "e", 86),
];
const sameRef = applyMerchantDiversitySafeguard(alreadyOk);
assert.deepEqual(
  sameRef.map((x) => x.title),
  alreadyOk.map((x) => x.title),
  "no reorder when already diverse"
);

console.log("merchant-diversity: ok");
