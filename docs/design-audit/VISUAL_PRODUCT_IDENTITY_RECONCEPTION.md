# QuantAI Visual Product Identity Reconception

**Scope:** Visual operating system only. Intelligence, APIs, ranking, compare logic, scoring, and card data are unchanged.

## What changed

### Environment architecture (replaces website page flow)

| Zone | Component | Role |
|------|-----------|------|
| Rail | `OSNavigationRail` | Fixed intelligence OS navigation |
| Gateway | `IntelligenceGateway` | Cinematic command surface (asymmetric manifest + terminal) |
| Archive | `qi-archive-shelf` | Saved products shelf |
| Scan | `ClassifiedScanField` | Intelligence scan output zone |
| Access | `AccessProtocolChamber` | Clearance / pricing (not SaaS cards section) |
| Appendix | Deferred marketing + trust | Legacy content, visually subdued |

Shell: `QuantIntelligenceEnvironment` — `app/page.tsx` wired end-to-end.

### Results — dossier stream (not product grid)

- `ProductResultsSurface`: single-column `qi-dossier-stream` with slots `prime` / `alpha` / `field`
- `ProductResultCard`: `qi-dossier-entity` — full intel preserved, module layout

### Styles

- `app/globals-quant-identity.css` — obsidian/titanium palette, gateway atmosphere, dossier entities, access chamber
- Root: `qi-universe` on `html` / `body` / environment

### Pricing route

- `/pricing` uses `OSNavigationRail` + `AccessProtocolChamber` (aligned with home access zone)

## Locked (unchanged)

Search, ranking, APIs, backend, compare behavior, trust engine, reasoning, signals, scoring, analysis generation, card information density.

## Validation

- `npm run build` — pass after `app/page.tsx` restore and environment wiring

## Screenshots

Capture under `docs/design-audit/screenshots/` with prefix `qi-universe-` after local `npm run dev`.
