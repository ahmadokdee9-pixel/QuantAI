# Search System Protection Contract

**Status:** Mandatory for all visual/UI work on QuantAI.

The search and intelligence pipeline is the platform core. Visual redesigns must **wrap** this system, never replace or destabilize it.

## Locked (do not modify without explicit product approval)

| Layer | Primary files |
|-------|----------------|
| Search API | `app/api/search/**` |
| Ranking / scoring | `app/api/search/lib/**`, `lib/intelligence/searchRankEnhance.ts`, `lib/shoppingScore.ts` |
| Parse / envelope | `lib/api/parseSearchResponse.ts` |
| Compare verdict API | `app/api/search/compare-verdict/**`, `lib/intelligence/compareIntelligence.ts` |
| Deal / signal engines | `lib/intelligence/dealIntelligenceEngine.ts`, `lib/intelligence/searchDecisionTypes.ts` |
| Home orchestration | `app/page.tsx` — `search()`, state, `sortedProductsMemo`, filters |
| Results rendering | `components/search/ProductResultsSurface.tsx`, `ProductResultCard.tsx` |
| Intelligence panels | `components/intelligence/GlobalIntelligencePanel.tsx`, compare panel |

## UI-only safe zones

- `app/globals-quant-*.css` — presentation only
- `components/cosmic/**` — layout shells around existing children
- `components/shell/**` — navigation chrome
- Typography, spacing, glow, motion on **non-blocking** pseudo-elements (`pointer-events: none`)

## Required patterns (already in place)

1. **Abort + run ID** — `searchAbortRef`, `searchRunIdRef`, `compareAbortRef`, `compareRunIdRef` prevent stale responses and race conditions.
2. **Mounted guard** — async handlers bail if component unmounted.
3. **Defensive parse** — `parseSearchResponse` wrapped in try/catch; failed parse does not crash render.
4. **Props passthrough** — `ProductResultsSurface` receives full product/intel state from `page.tsx`; visual wrappers must not filter or hide props.
5. **Conditional mount** — `hasScan` only gates *visibility* of results section; it does not change search logic.

## Forbidden UI patterns

- `display: none` / `opacity: 0` / `visibility: hidden` on `#quantai-results-anchor`, `.qc-entity-cell`, or card inner content (except decorative `::before`/`::after` with `pointer-events: none`)
- `pointer-events: none` on interactive results surfaces
- Replacing `ProductResultsSurface` with a mock or static layout
- CSS `content-visibility: auto` or `overflow: clip` on result cards (causes blank trays)
- Unmounting results during `loading === true` when `products.length > 0` (partial refresh must keep tray visible)

## Priority order (when conflicts arise)

1. Search stability  
2. Search responsiveness  
3. Rendering consistency  
4. Intelligence pipeline continuity  
5. UI elegance  

## Verification before merge

- `npm run build`
- Manual: submit search → products render → sort/filter → compare tray → no blank section
- Rapid double-submit: no duplicate trays / stuck loading
- Navigate away mid-search: no console errors / state updates on unmounted tree
