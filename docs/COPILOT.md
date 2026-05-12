# QuantAI conversational copilot

## What was added

A **session-scoped shopping copilot** that answers from the current QuantAI context (search results, saved items, compare tray, tier, route). Responses are **structured JSON** with graceful **heuristic fallback** when OpenAI is unavailable or errors.

## Files touched (by area)

| Area | Path |
|------|------|
| Session types | `lib/copilot/sessionTypes.ts` |
| Session equality (loop guard) | `lib/copilot/sessionEquality.ts` |
| Structured schema (Zod) | `lib/copilot/structuredResponse.ts` |
| Heuristic engine | `lib/copilot/heuristicCopilot.ts` |
| OpenAI path | `lib/copilot/openaiCopilot.ts` |
| Product → brief | `lib/copilot/mapProduct.ts` |
| API | `app/api/copilot/chat/route.ts` |
| Rate limit | `lib/rate-limit.ts` (`copilotRatelimit`) |
| React context | `components/copilot/CopilotContext.tsx` |
| UI drawer + chips | `components/copilot/CopilotDrawer.tsx` |
| Shell wiring | `components/shell/QuantShell.tsx` |
| Home session sync | `app/page.tsx`, `components/search/ProductResultsSurface.tsx` |
| Dashboard session | `app/(app)/dashboard/page.tsx` |
| Saved session | `app/(app)/saved/page.tsx` |
| Pricing session | `app/pricing/page.tsx` |
| Env template | `env.example` |

## How to test locally

1. **Install & dev**

   ```bash
   npm install
   npm run dev
   ```

2. **Quality gates**

   ```bash
   npm run lint
   npm run build
   ```

3. **Copilot with search**

   - Open `/`, run a search.
   - Open the copilot (sparkle FAB), use a chip or type a question.
   - Confirm answers reference visible listings (titles/links) when data exists.

4. **Without OpenAI**

   - Unset or blank `OPENAI_API_KEY` in `.env.local`.
   - Copilot should still return JSON with `source: "heuristic"` and sensible text.

5. **Saved / compare / dashboard / pricing**

   - Save products and add items to compare; confirm copilot context chips/prompts still work on home.
   - Visit `/dashboard` and `/pricing`; copilot session should reflect route and tier where applicable.

6. **Mobile**

   - Narrow viewport: FAB should sit above bottom nav safe area; drawer should scroll and not break layout.

## Environment

- `OPENAI_API_KEY` — optional; when missing, responses use heuristics only.
- `QUANTAI_COPILOT_MODEL` — optional override for the copilot model (see `lib/copilot/openaiCopilot.ts`).
- Redis (optional) — enables stricter copilot rate limits via existing Upstash vars in `env.example`.
