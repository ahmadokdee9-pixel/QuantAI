# Wave 1 baseline (pre-change)
- recorded_at: 2026-08-05T11:05:16.6617320+02:00
- checkpoint_commit: 64a9e9bac9c462ff3f1e037e54e955ca2f53e9db
- rollback_tag: rollback-wave1-20260805-110454
- deploy_baseline_tag: deploy-wave1-baseline-20260805-110454
- health_latency_ms: 381
- health_upstash: True
- health_ok: True
- search_latency_ms: 9507
- search_http: 200
- search_products: 16
- homepage_raw_bytes: 87597
- api_latency_proxy: health_ms=381 search_ms=9507
- error_rate: not instrumented yet (baseline = pre PB-10)
- lighthouse: deferred to post-build local/CI note (see report)
- build_time: pending local npm run build
- bundle_size: pending .next after build

## Local build baseline (pre-deploy)
- build_sec: 62.2
- tsc_ok: true
- static_bytes: 4088420
- largest_css_kb: 586.1
- largest_js_kb: 1614.5
- lighthouse: deferred to post-deploy probe

