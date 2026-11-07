# [P1][OPS-01] Expose authorized operational tools through the existing copilot

<!-- corely-backlog:corely-internal-ops-v1:OPS-01 -->

**Planning key:** `OPS-01`\
**Type:** Feature\
**Catalog scope:** P1 — focused launch\
**App/area:** Shared product/platform work (not a separate app)\
**Research basis:** Supplied Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement; Corely_App_Catalog_and_Recommendations.md shared-platform/release recommendations\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

AI and UI use the same controlled business commands.

## Parent and scope

Parent planning key: `EP-CONNECTED`. Replace or accompany with the actual parent issue URL.
Reuse the copilot, tools and events for Today, neutral absence effects, sourced briefings and reviewed plans. No autonomous staffing optimization.

## Current state / reuse evidence

Before publishing, add verified owner, source paths, related issue/PRs and missing delta. Current implementation is not established by this ticket specification. If already covered, map that evidence rather than opening duplicate work.

## Dependencies

Hard prerequisites: `STR-01`, `PLAT-02`. Resolve to real issues or verified existing equivalents.

## Acceptance criteria

- [ ] Typed read/propose/apply tools reuse the registry; trusted server context supplies actor/tenant/workspace, not untrusted model input.
- [ ] Reads filter permissions; apply rechecks access, version and invariants through existing owning use cases, never direct database writes.
- [ ] Sensitive/outbound changes require approval of the exact proposal; tools cannot grant roles or override policy.
- [ ] Runs have redacted provenance, safe retries and bounded usage; separately configured deterministic automations retain their explicit policy.

## Verification

Contract/access/stale-version tests, adversarial tool input, redacted audit and AI-disabled checks.

## Definition of Done

- [ ] Reuse and ownership evidence is recorded; only the scoped missing delta is implemented and existing behavior is preserved.
- [ ] Applicable permission/isolation, replay/concurrency and UI/error-state checks pass; commands, results and skips are reported accurately.
- [ ] Documentation and source/decision links are updated; no unsupported readiness, compliance, customer-validation or test claims.
- [ ] Acceptance criteria are demonstrated with evidence; planning or issue creation alone does not complete delivery.
