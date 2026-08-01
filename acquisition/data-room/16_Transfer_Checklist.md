# 16 — Transfer Checklist

Canonical facts: [`MASTER_INDEX.md`](./MASTER_INDEX.md).

Mark items complete only when executed or evidenced.

---

## Legal / IP
- [ ] Acquisition agreement executed  
- [ ] IP assignment for proprietary code & docs  
- [ ] Align draft `LICENSE` with agreement  
- [ ] QuantAI brand / trademark handling agreed  
- [ ] OSS dependency obligations acknowledged  

## Source control
- [ ] Repo admin transfer  
- [ ] Remove seller deploy keys  
- [ ] Agree freeze/tag handling  
- [ ] Confirm no secrets in git history of concern  

## Domain & hosting
- [ ] DNS/domain update  
- [ ] Vercel transfer **or** redeploy  
- [ ] Set `NEXT_PUBLIC_APP_URL`  
- [ ] Confirm cron after cutover  

## Clerk
- [ ] Transfer app **or** recreate  
- [ ] Update env keys  
- [ ] User migration vs clean start decision  

## Supabase
- [ ] Transfer project **or** new project + run **all 7** migrations  
- [ ] Data migrate/scrub per privacy law  
- [ ] Rotate service role / anon keys  
- [ ] Verify RLS  

## Stripe
- [ ] Transfer account **or** recreate prices  
- [ ] Update price IDs  
- [ ] Webhook endpoint + signing secret  
- [ ] Reconcile `user_billing_state` if migrating subscribers  

## Discovery & AI
- [ ] SerpAPI account/key + quota  
- [ ] OpenAI key + spend caps  
- [ ] Validate search + compare on staging  

## Optional
- [ ] Upstash  
- [ ] Analytics sink  
- [ ] Rotate `CRON_SECRET`  

## Acceptance
- [ ] `/api/health` services match expectations  
- [ ] Guest search returns products  
- [ ] Auth → `/dashboard`  
- [ ] Checkout smoke (test mode OK initially)  
- [ ] Gates: Phase A, calibration, Phase 4, merchant diversity, build/tsc  

## Revocation
- [ ] Seller production admin removed after handover window  
- [ ] All shared credentials rotated  

## Not automatic
Seller personal contacts; unrelated clouds; marketplace accounts; unverified “customer book.”
