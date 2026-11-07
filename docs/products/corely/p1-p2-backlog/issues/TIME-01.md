# [P2][TIME-01] Choose the first time-recording use case and integration

<!-- corely-backlog:corely-internal-ops-v1:TIME-01 -->

**Planning key:** `TIME-01`\
**Type:** Feature\
**Catalog scope:** P2 — conditional next; not an implementation commitment\
**App/area:** #12 Corely Time\
**Research basis:** Supplied Corely_App_Catalog_and_Recommendations.md, app profiles #12; Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

Avoid building a specialist time system before testing an established provider.

## Parent and scope

Parent planning key: `EP-TIME`. Replace or accompany with the actual parent issue URL.
Choose working-time recording or project timesheets and one existing provider integration before native development. No payroll or passive productivity monitoring.

## Current state / reuse evidence

Before publishing, add verified owner, source paths, related issue/PRs and missing delta. Current implementation is not established by this ticket specification. If already covered, map that evidence rather than opening duplicate work.

## Dependencies

Hard prerequisites: `STR-01`, `PEOPLE-01`. Resolve to real issues or verified existing equivalents.
Conditional implementation gate: `REL-04` promotion decision or documented equivalent. Keep in the conditional backlog until evidence is recorded; discovery/planning may proceed.

## Acceptance criteria

- [ ] Record the P2 promotion evidence and choose working-time recording or project timesheets, not both by default.
- [ ] Evaluate the actual provider access, costs/limitations, IDs, permissions, export and correction support; no claimed connector without verification.
- [ ] Document integrate-first outcome, or evidence-backed justification and reviewed rules for a narrow native alternative.
- [ ] Define record authority, timezone, source provenance and employee visibility; no inference from task status, screens or messages.

## Verification

Provider proof of access using synthetic data and a written contract/ownership decision.

## Definition of Done

- [ ] Reuse and ownership evidence is recorded; only the scoped missing delta is implemented and existing behavior is preserved.
- [ ] Applicable permission/isolation, replay/concurrency and UI/error-state checks pass; commands, results and skips are reported accurately.
- [ ] Documentation and source/decision links are updated; no unsupported readiness, compliance, customer-validation or test claims.
- [ ] Acceptance criteria are demonstrated with evidence; planning or issue creation alone does not complete delivery.
