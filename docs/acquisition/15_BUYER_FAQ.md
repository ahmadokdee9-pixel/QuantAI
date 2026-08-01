# 15. Buyer FAQ

---

### What is QuantAI in one sentence?
An AI-assisted commerce decision app that ranks multi-merchant offers and returns calibrated buying guidance — not a proprietary product catalog.

### What am I actually buying?
Source code, product IP (subject to agreement), documentation, migrations, tests/gates, and a runnable application architecture. Third-party accounts transfer only if negotiated.

### Is there proven revenue?
This seller package **does not assert** verified ARR/MRR/GMV/user counts. Evaluate as a product/IP asset unless separate financials are provided under NDA.

### Does QuantAI own product inventory?
No. Discovery depends on external commerce sources (notably SerpAPI).

### What makes it different from “ChatGPT for shopping”?
Deterministic Phase A ranking authority, decision calibration with mismatch discipline, merchant diversity, and credible discount gating — with offline regression locks.

### Are all AI modules live in production?
No. Many experimental layers are **default OFF**. Buy the live decision core; treat dormant layers as optional future inventory.

### What is the freeze tag?
`quantai-sale-candidate-v1` is the sale-candidate baseline reference for diligence.

### Why does the package say `smartbuy`?
Historical npm package name. Product brand is QuantAI.

### What is the #1 technical risk?
Upstream discovery dependency and end-to-end/cold search latency — both can make live demos look weak if environment/ops are incomplete.

### Can this run without Vercel?
Architecturally it is a Next.js app and can be redeployed elsewhere, but current ops/docs are Vercel-oriented and some caching patterns assume that ecosystem.

### Can this run without SerpAPI?
Not as a full shopping product today without a replacement discovery source.

### Is Stripe required for a technical demo?
No for core search demo. Yes for monetization demonstration.

### How strong is the test story?
Strong on **acquisition-critical offline gates**. Do not assume CI runs the entire script inventory.

### Is there a LICENSE in the repo?
Ownership/transfer must be confirmed via purchase documents and IP assignment. Do not assume terms from packaging alone.

### What should a 5-minute demo show?
Warm multi-merchant query → coherent ranking → calibrated labels → compare alignment → (optional) verified discount example — on a fully credentialed staging/production URL.

### What should we freeze after LOI?
Phase A ranking, calibration, diversity/discount credibility paths, and primary results UI — unless both parties explicitly agree otherwise.

### Where is the deeper technical data room?
See `docs/FINAL_BUYER_DATA_ROOM.md` and related buyer architecture / risk / moat memos under `docs/`.

### Who is the ideal buyer?
A strategic or technical acquirer that wants a commerce **decision engine** and can supply distribution or GTM — not a buyer seeking exclusive inventory or proven high ARR without further work.
