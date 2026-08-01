# QuantAI — Performance Evidence

**Sprint:** Acquisition Prep Sprint 3  
**Honesty rule:** Record **real** measurements only. Do not invent P50/P95 for production.

---

## What can currently be proven (this workspace)

### A. Offline stale-prefer / race correctness

**Command:**

```bash
npx --yes tsx scripts/benchmark-search-speed-path.mjs
```

**Observed (Sprint 3 re-run):**

```
=== Search speed path benchmark ===
stalePreferMs (beta default): 120   # script sets test prefer window
race fast live servedStale: false
race slow live servedStale: true
bench: racePipelineWithStalePrefer (fast live) avg≈0.01ms (200 iter)
```

**Proves:** If a stale tray exists and live enrichment is slow, the race prefers stale after the prefer window — without changing Phase A ranking logic on the returned tray.

**Does not prove:** End-user wall-clock search latency against SerpAPI/production.

### B. Ranking kernel latency (offline Phase 4 gate)

From last green `npm run test:phase4-ranking-validation` (Sprint 1/3 gates):

| Metric | Typical observed band |
|--------|------------------------|
| foundationGeneration p50/p95 | ~1–3 ms |
| rankingDecisionRecord p50/p95 | ~2–6 ms |
| trayRanking p50/p95 | ~5–21 ms |
| simulatedApiRankBatch p50/p95 | ~7–17 ms |

**Proves:** Local ranking computation is fast.  
**Does not prove:** Full `/api/search` including SerpAPI.

### C. Mechanism documentation

See [`DEMO_LATENCY_PROOF.md`](./DEMO_LATENCY_PROOF.md) for timeout defaults, stale-prefer wiring, and cache behavior.

---

## What cannot currently be proven here

| Claim | Status |
|-------|--------|
| Production / staging search **P50 / P95** | **NOT MEASURED** — `SEARCH_BASE_URL` unset in this session |
| Remote smoke against deployed URL | **NOT RUN** — needs `SEARCH_BASE_URL` |
| Upstash rate-limit remote verify | **NOT RUN** — optional + needs deploy |

**Absence of a live endpoint measurement is a diligence gap**, not a product failure. Seller/buyer must capture artifacts before listing claims about “sub‑N‑second search.”

### D. Step 6 live production measurement (attached)

See [`PRODUCTION_DEMO_EVIDENCE.md`](./PRODUCTION_DEMO_EVIDENCE.md) and raw JSON  
[`architecture-audit/beta-launch/step6-production-evidence.json`](./architecture-audit/beta-launch/step6-production-evidence.json).

Against `https://quant-ai-app.vercel.app` (30 successful samples): warm P50 **7860 ms**, warm P95 **8351 ms**, cold P95 **18212 ms**.

---

## Exact commands (seller / buyer)

```bash
# 1) Offline race proof
npx --yes tsx scripts/benchmark-search-speed-path.mjs

# 2) Live latency probe (requires deployed URL)
# PowerShell:
$env:SEARCH_BASE_URL="https://YOUR_DOMAIN"
$env:BETA_PROBE_WARM="true"
$env:BETA_P95_MAX_MS="8000"
npm run test:beta-latency-probe

# 3) Broader remote P0 (optional)
$env:SEARCH_BASE_URL="https://YOUR_DOMAIN"
npm run test:public-beta-p0:remote
```

**Metrics produced by latency probe:** per-query status, wall-clock `latencyMs`, product counts, optional warm pass, p50/p95 vs budget; writes under `docs/architecture-audit/beta-launch/` when successful.

**Recommended evidence artifact:** Attach the probe JSON/report output to the data room after a successful run. Do not paste secrets.

---

## Recommended diligence language until live probe exists

> “Ranking and decision computation are offline-validated at millisecond scale. End-to-end search latency is dominated by SerpAPI/network; production P50/P95 will be attached from `test:beta-latency-probe` against the deployed URL. Warm/stale paths mitigate slow live enrichment for repeat queries.”
