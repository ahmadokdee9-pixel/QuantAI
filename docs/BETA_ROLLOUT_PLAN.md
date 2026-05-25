# Beta rollout plan

**Operations runbooks:** `docs/INVITE_ONLY_BETA_ROLLOUT.md`, `docs/PRODUCTION_ROLLOUT_CHECKLIST.md`, `docs/PUBLIC_BETA_LAUNCH_CHECKLIST.md`, readiness score `docs/architecture-audit/beta-launch/BETA_LAUNCH_READINESS_SCORE.md`.

## Phase 0 — Internal (5–10 users, 3–5 days)

**Goal:** Catch P0 regressions without reputation risk.

| Task | Owner |
|------|-------|
| Complete `docs/PUBLIC_BETA_LAUNCH_CHECKLIST.md` P0 | Eng |
| Production env manifest deployed | Eng |
| `npm run test:public-beta-p0` green against Production URL | Eng |
| 30-query manual QA (≥28/30 pass) | Product + Eng |
| Upstash + Supabase verified | Eng |
| Daily SerpAPI/OpenAI spend review | Eng |

**Users:** Founders, engineers, 3–5 trusted shoppers.  
**Access:** Direct URL; no marketing.  
**Monetization:** Off (free tier only).

## Phase 1 — First 100 (invite-only, 2–3 weeks)

**Goal:** Validate retention and search quality under real diversity.

| Control | Setting |
|---------|---------|
| Access | Invite codes or allowlist email |
| Rate limits | Upstash required; guest cap enforced |
| Intelligence | Phases 11–18 **OFF**, APPLY **OFF** |
| Support | Single channel (email/Discord) |
| Metrics | Daily: p95 latency, empty rate, 429 rate |

**Exit criteria for Phase 2:**

- 7 consecutive days: p95 search &lt; 8s, empty rate &lt; 15% on golden queries
- Zero ranking mutation incidents in meta audits
- No Sev-1 auth/saved/compare outages

## Phase 2 — First 1000 (waitlist, 4–8 weeks)

**Goal:** Scale ops and decide monetization.

| Control | Setting |
|---------|---------|
| Waitlist | Gradual batches (50–100/week) |
| Stripe | Enable Pro after support playbook ready |
| Observability | Dashboards + paging on search 5xx |
| Quality | Weekly `test:realworld` on Production |

**Do not enable** until Phase 1 exit: normalization APPLY, Phases 11–18 production enable, intent/taste APPLY.

## Rollback

1. Disable invite issuance.
2. Set `QUANTAI_NORMALIZATION_ENABLED=false` if telemetry anomaly.
3. Vercel instant rollback to last green deployment.
4. Post-mortem using `docs/architecture-audit/beta-launch/LATENCY_PROBE_REPORT.md`.
