# Latency Report — Stage 1 Shadow

**Generated:** 2026-05-23T01:35:19.656Z

## Offline benchmark baseline

| Metric | Value | Gate |
|--------|------:|------|
| Shadow avg (fixtures) | ~17ms | reference |
| Normalization p95 target | < 5ms | production |
| Search p95 regression | < 5% | vs baseline |

## Production telemetry fields

- `meta.normalizationProduction.latencyMs`
- `meta.searchLatencyMs`
- `meta.normalizationProduction.latencyPctOfSearch`

Monitor via `quantai.normalization.shadow` logs after deploy.
