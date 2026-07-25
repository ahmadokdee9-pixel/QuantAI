# QuantAI — Naming Note

**Buyer-facing product brand:** QuantAI  

**Do not perform risky renames** of packages, paths, databases, or env prefixes as part of acquisition packaging.

| Name | Classification | Where it appears | Buyer guidance |
|------|----------------|------------------|----------------|
| **QuantAI** | Buyer-facing product brand | UI copy, docs, env comments, Vercel project references (`quant-ai`) | Use this in diligence materials and demos |
| **smartbuy** | Legacy / internal repository & npm identifier | `package.json` `"name": "smartbuy"`, local folder paths, some historical docs | Treat as **repo/package id**, not the product brand |
| **SmartBuy** | Occasional historical/marketing casing | Sparse; not the canonical brand | Prefer **QuantAI** in new buyer docs |
| **quant-ai** | Deployment identifier | Vercel project name in env docs | Infrastructure label, not marketing name |
| **QUANTAI_*** | Production env prefix | Feature flags, stabilization, analytics | Keep; renaming breaks ops |

## Recommendation (post-close, optional)

- Short term: keep `smartbuy` package name; document alias (this file).  
- Medium term (buyer program): rename npm package / repo only with coordinated CI, Vercel, and docs updates — **not** a Sprint 2 task.
