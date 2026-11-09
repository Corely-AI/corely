# #400 — Focused client CI

- Issue: https://github.com/Corely-AI/corely/issues/400 (SURF-20; parent #380).
- Prerequisites #381 and #391 verified closed Completed on November 9, 2026.
- Branch `400-focused-client-ci`, base `corely/development` at `05fceeeb34`.
- Scope: conservative complete Vite-consumer fan-out, isolated validation/build
  artifacts, import boundaries, existing focused browser and shared unit suites.
- Canonical behavior and reproducible commands: [consumer CI](../frontend/consumer-ci.md).
- No UI change, deployment, merge, migration or API contract change.

## Verification

- Import policy: four node tests passed; actual frontend source scan passed.
- Invoice, App Center and login typechecks passed.
- Invoice, App Center and login builds passed.
- App Center browser suite: three passed using installed local Chrome.
- Initial Invoice browser attempt used missing bundled Chromium; reran using
  the explicit local Chrome override added to its existing configuration: six passed.
- Scoped ESLint passed. Repository architecture check retains its pre-existing
  missing `services/worker/src` failure; new frontend scanner passes independently.
- Full consumer matrix and hosted Actions execution require the published PR;
  local focused checks do not claim every legacy consumer passes.
- Source policy covers public route entry points, not a production bundle-size audit.
  No HR workspace is scaffolded by this task; discovery includes it once present.
