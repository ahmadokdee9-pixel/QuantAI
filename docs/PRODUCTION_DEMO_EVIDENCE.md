# QuantAI Production Demo Evidence

**Generated:** 2026-07-25T19:00:00.752Z (UTC)  
**Measurement method:** End-to-end HTTP wall-clock against deployed `/api/search` (request start → completed JSON).  
**Raw artifact:** [`architecture-audit/beta-launch/step6-production-evidence.json`](./architecture-audit/beta-launch/step6-production-evidence.json)  
**Honesty rule:** Numbers below are observed. No estimates. No invented P95.

---

## 1. Deployment

| Field | Value |
|-------|--------|
| Production / staging URL | **https://quant-ai-app.vercel.app** |
| Deployment timestamp (evidence run) | 2026-07-25T19:00:00.752Z |
| Local `main` commit (this workspace) | `e30a63829afd004ef5f1502f6af9dc8fdc8de235` |
| Sale-candidate tag commit | `0dea77e820c35176769673fba24b23401c3d8969` (`quantai-sale-candidate-v1`) |
| Fresh Vercel redeploy this session | **NOT PERFORMED** — Vercel CLI token invalid / `VERCEL_TOKEN` missing |
| Deployment status | **EXISTING_PRODUCTION_VERIFIED** (homepage 200, `/api/search` 200, `/api/health` ok) |
| Deployment ID | **UNKNOWN** (no Vercel API access this session) |

**Note:** Linked local project name is `quant-ai` (`.vercel/project.json`). Canonical buyer URL used for evidence is `https://quant-ai-app.vercel.app` (search works). `https://quant-ai.vercel.app` returns homepage but `/api/search` **404** — do not use for demos.

### Smoke checks (observed)

| Check | Result |
|-------|--------|
| Homepage `GET /` | **200** (~47 ms) |
| `GET /api/health` | **200** `ok:true` |
| `GET /api/search` | **200** success on golden queries |
| Health services | clerk **true**, supabase **true**, serpapi **true**, openai **true**, stripe **false**, upstash **true** |

---

## 2. Environment readiness

Status names only — **no secret values**.

| Variable / service | Class | Status (this session) |
|--------------------|-------|------------------------|
| SerpAPI (`SERPAPI_KEY`) | REQUIRED_FOR_SEARCH | PRESENT (local); production health **true** |
| Clerk publishable + secret | REQUIRED_FOR_APP | PRESENT (local); production health **true** |
| Supabase URL + service role (+ anon) | REQUIRED_FOR_APP | PRESENT (local); production health **true** |
| OpenAI | REQUIRED_FOR_APP (AI surfaces / build wiring) | PRESENT (local); production health **true** |
| `NEXT_PUBLIC_APP_URL` | OPTIONAL (polish / returns) | MISSING locally; production URL used as `SEARCH_BASE_URL` equivalent |
| Stripe | OPTIONAL (billing demo) | MISSING locally; production health **false** |
| Upstash | OPTIONAL | MISSING locally; production health **true** |
| Analytics sink | OPTIONAL | Not mandatory |
| `VERCEL_TOKEN` / CLI login | REQUIRED to redeploy from this agent | **MISSING / INVALID** |

---

## 3. Demo queries

Controlled buyer demo against **https://quant-ai-app.vercel.app** (6 golden-style queries).  
Latency = end-to-end API wall-clock (ms). Labels taken from live payload (`qiBuyingDecision` / decision brief) — live field names may differ from UI chip copy.

| Query | Category | Results | Distinct merchants | Discount surfaced | Top label (live payload) | Confidence | Latency (ms) | Fallback / stale |
|-------|----------|--------:|-------------------:|-------------------|--------------------------|------------|-------------:|------------------|
| MacBook Pro 14 | electronics-laptop | 21 | 13 | yes | High Volatility | 83 | 8431 | no |
| iPhone 15 Pro 256GB | electronics-phone | 20 | 12 | yes | High Volatility | 28 | 12033 | no* |
| OLED TV 55 inch | electronics-tv | 23 | 15 | yes | Best Regional Deal | 90 | 8371 | no |
| corner sofa | furniture | 0 | 0 | no | — | — | 3924 | empty tray |
| Sony WH-1000XM5 | electronics-audio | 1 | 1 | no | Compare | 46 | 16969 | sparse tray |
| Adidas Samba | fashion-footwear | 24 | 15 | yes | Safe Trusted Offer | 93 | 27331 | no |

\*During the batch demo pass, one iPhone sample recorded a MacBook title as top row (possible guest-cache / concurrency anomaly). A **follow-up probe** of the same query returned 23/23 iPhone-like titles (Back Market / Amazon / Coolblue / eBay). Treat as a disclosed reliability risk, not as guaranteed permanent corruption.

**Demo totals:** 6 queries · 6 HTTP success · categories covered: laptop, phone, TV, furniture, audio, footwear · multi-merchant max observed: **15**.

---

## 4. Production latency

**Base URL:** https://quant-ai-app.vercel.app  
**Sample design:** 10 cold + 20 warm repeats = **30 successful** `/api/search` requests (0 failures).  
**Metric:** client-observed wall-clock to completed response (not ranking-kernel ms).

### Overall (n=30 successful)

| Metric | ms |
|--------|---:|
| sample count | 30 |
| min | 190 |
| median / P50 | 7962 |
| P75 | 8153 |
| P90 | 8351 |
| P95 | 17951 |
| max | 18212 |
| average | 8091 |

### Cold (n=10)

| Metric | ms |
|--------|---:|
| P50 | 8060 |
| P95 | 18212 |
| max | 18212 |
| min | 7299 |
| average | 9979 |

### Warm (n=20)

| Metric | ms |
|--------|---:|
| P50 | 7860 |
| P95 | 8351 |
| max | 8407 |
| min | 190 |
| average | 7148 |

**Interpretation:** End-to-end latency is dominated by **external search/provider + network**, not local ranking kernels (offline kernels remain millisecond-scale). Some warm hits are fast (e.g. Dyson ~190–248 ms — cache/stale path), but most warm repeats still clustered ~7.3–8.4 s.

### Buyer-perceived speed class (evidence-only)

| Class rule | Observed warm P95 |
|------------|-------------------|
| EXCELLENT ≤3s / GOOD ≤5s / ACCEPTABLE ≤8s / **WEAK >8s** | **8351 ms → WEAK** |

Reproduce:

```bash
# PowerShell
$env:SEARCH_BASE_URL="https://quant-ai-app.vercel.app"
$env:BETA_PROBE_WARM="true"
$env:BETA_P95_MAX_MS="8000"
npm run test:beta-latency-probe
```

---

## 5. Commerce behavior proof

| Claim | Evidence this run | Result |
|-------|-------------------|--------|
| Multi-merchant preservation | Demo trays with up to **15** distinct stores (MacBook/OLED/Adidas) | **PASS** |
| Verified discount surfacing | Discount note / verified markdown signals on MacBook, iPhone, OLED, Adidas | **PASS** (not every query) |
| Decision / recommendation surface | Live buying labels + decision brief present | **PASS** (live label vocabulary varies) |
| Phase A authority | Unchanged offline gates 11/11; no ranking code edits in Step 6 | **PASS** (offline + freeze) |
| Merchant diversity regression | `test:merchant-diversity` PASS | **PASS** |
| Calibration regression | `test:phase-a-decision-calibration` 17/17 | **PASS** |
| No ranking mutation during Step 6 | No `app/`/`lib/`/`components/` changes | **PASS** |
| Empty / sparse upstream trays | `corner sofa` = 0 products; XM5 = 1 product | **DISCLOSED** |
| Identity / query match | Follow-up iPhone probe clean; one batch anomaly disclosed | **CONDITIONAL** |

Offline critical gates (local, Sequential Step 6): build PASS · tsc PASS · Phase A 11/11 · calibration 17/17 · Phase4 23/23 · merchant-diversity PASS · P0 PASS.

---

## 6. Known limitations

- **SerpAPI / upstream dependency** — discovery quality, coverage, and latency inherit the provider.
- **Cold and most warm searches are slow for buyer expectations** — warm P95 **8351 ms** (WEAK).
- **Cold outliers** — gaming laptop / Dyson cold samples ~18 s drove cold/overall P95.
- **Empty trays happen** — `corner sofa` returned 0 products this run (market/feed).
- **Sparse trays happen** — XM5 returned 1 listing this run.
- **Stripe not enabled on production health** — billing demo not available on this URL.
- **Could not redeploy from this session** — cannot cryptographically prove production binary equals local `e30a638` without Vercel auth.
- **Possible intermittent guest-cache / concurrency anomaly** — one iPhone batch row showed MacBook top title; re-probe correct.
- **Live recommendation label strings** may not always equal UI chip set `BUY / COMPARE / AVOID / BEST VALUE` wording — UI maps calibrated decisions; API also exposes broader `qiBuyingDecision` labels.
- `quant-ai.vercel.app` is **not** a valid search demo host (`/api/search` 404).

---

## 7. Buyer demo script (5–10 minutes)

1. Open **https://quant-ai-app.vercel.app**  
2. Confirm homepage loads (no crash).  
3. Search **MacBook Pro 14** — show multi-merchant tray + decision brief.  
4. Search **OLED TV 55 inch** — show discount authenticity note when present + merchant spread.  
5. Search **Adidas Samba** — non-electronics diversity.  
6. Search **Sony WH-1000XM5** — model match (may be sparse).  
7. Optionally open compare / save if signed in (Clerk).  
8. Do **not** demo billing unless Stripe is enabled.  
9. Disclose: first searches may take ~8–18 s; warm may still be ~8 s; empty furniture queries possible.  
10. Point buyer to this document + [`FINAL_BUYER_DATA_ROOM.md`](./FINAL_BUYER_DATA_ROOM.md).

---

## 8. Final evidence verdict

**READY WITH DISCLOSED LIMITATIONS**

Rationale: Production URL works, multi-merchant and discount evidence observed, offline intelligence gates green, freeze intact — but warm P95 is **WEAK (>8s)**, some queries empty/sparse, Stripe off, and production binary ↔ `main` HEAD not re-verified via redeploy this session.
