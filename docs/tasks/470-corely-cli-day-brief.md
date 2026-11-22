# 470 Corely CLI daily brief

- Issue [#470](https://github.com/Corely-AI/corely/issues/470), epic [#468](https://github.com/Corely-AI/corely/issues/468).
- Branch `470-corely-cli-day-brief` is stacked on `471-corely-cli-agent-grants` ([PR #476](https://github.com/Corely-AI/corely/pull/476)). Retarget to `development` and reverify the diff and checks after the prerequisite integrates.
- Delivers the narrow read projection relevant to [#328](https://github.com/Corely-AI/corely/issues/328) while retaining that issue's broader Today scope. Booking selects a redacted operational projection, People supplies neutral availability, and Tasks owns filtering and checklist state. The brief neither persists a read model nor uses a model provider.

## Verification and evidence

- CLI build and typecheck, API build and typecheck, staged lint and whitespace passed.
- Nine OpenBuk PostgreSQL tests, one CLI HTTP/authorization integration test, and four brief projection tests passed. Covered a Berlin day boundary, overlapping availability, source failure, disabled apps, stale reads, capability authorization, and exclusion of private fields.
- [Windows CLI output](470-assets/day-brief-terminal.png) shows actual terminal formatting over a synthetic local HTTPS source fixture for normal, empty, and partial reads. JSON uses a null total for unavailable inputs. The source fixture uses the same composer as the API.
- Audit extends the existing grant operation trail. Human access uses workspace manager authority. Business-domain read access is evaluated again for each section. No migration or activation change beyond the existing CLI flags.
