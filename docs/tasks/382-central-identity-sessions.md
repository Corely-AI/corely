# 382 — Central identity and per-app session design

## Tracking and outcome

- Issue: [#382 / SURF-02](https://github.com/Corely-AI/corely/issues/382).
- Parent: [#380](https://github.com/Corely-AI/corely/issues/380).
- Hard prerequisite: [#381](https://github.com/Corely-AI/corely/issues/381), open at inspection; no approved host matrix established.
- Branch: `382-central-identity-sessions`; intended PR base: `development` on `corely` (`Corely-AI/corely`), verified through GitHub and fetch.
- PR: [Draft #405](https://github.com/Corely-AI/corely/pull/405).
- Outcome: [proposed ADR-0004](../decisions/ADR-0004-central-identity-app-sessions.md) provides the current auth trace, provider/operation proposal, session/API contracts, five sequences, abuse cases and compatibility/migration/rollback plan.
- Exclusions: runtime auth changes, provider provisioning, domain moves, migrations, POS/portal migration, deployment and roadmap promotion.

## Reuse and plan

Inspected baseline `3a3492196497d38da088b5222b96cd42bd01ad21`, matching fetched
`corely/development` on 2026-11-08. Working tree was clean. No existing #382 PR
was returned by GitHub search. The checkout started on `381-focused-surface-adr`
at that same baseline with no prerequisite changes; this branch was created
independently from `corely/development`.

Identity owns users, membership, custom JWTs, refresh and tenant switching.
Shared AuthClient and WebStorageAdapter currently persist browser tokens;
POS uses native SecureStore with a web localStorage fallback. Portal has a
separate OTP/cookie flow. Preserve these contracts and identities while adding
the future OIDC/BFF path. No source security finding is claimed from this trace.

The proposed choice is self-hosted Keycloak plus per-host server sessions.
Provider operation is a decision requiring an accepting operator, not a claim
that hosting/support exists. #381 remains a prerequisite to binding hostnames.
ADR-0003 is reserved for that focused-surface decision; ADR-0004 is proposed here.

## Verification

| Command or manual check                                                                    | Result and limits                                                           |
| ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| `gh repo view Corely-AI/corely --json defaultBranchRef` and `git fetch corely development` | Passed with network access; default is development and baseline matched.    |
| Identity/shared-client/POS/portal source trace                                             | Recorded with local source links in ADR; source evidence only.              |
| Official RFC/OIDC/Keycloak reference inspection                                            | Reviewed protocol/provider docs; no live IdP or domain inventory.           |
| Formatting, local paths and whitespace                                                     | Passed; final results recorded below.                                       |
| Application/security integration tests                                                     | Not run: documentation only; proposed abuse outcomes are not passing tests. |

## UI/UX evidence

N/A: documentation-only design. No interface or runtime authentication behavior
changed. Diagrams specify future interactions; no rendered app evidence is claimed.

## Impact and remaining work

No runtime, configuration or schema changes. Reverting documentation is the
entire rollback for this PR. Keep Draft and #382 open: #381 host approval,
platform/provider support acceptance, security approval of diagrams/abuse cases,
and product acceptance of recovery/migration remain outstanding. No owner
assignment, project reprioritization, human approval or IdP registration is inferred.

Final documentation checks: installed Prettier from the existing gateway checkout
(`/Users/hadoan/Documents/sennder/truckerpoints-gateway/node_modules/prettier/bin/prettier.cjs`)
was used with `--check` on the three changed Markdown files; passed. Targeted
Python local-path validation checked 124 references, none missing. Five Mermaid
sequence blocks were inspected for participants, branches and balanced delimiters;
no browser diagram rendering or protocol execution is claimed.
`git diff --cached --check` and `node scripts/check-staged-line-limit.mjs` passed.
The checkout has no node_modules; the lint-staged hook cannot run here. Its only
applicable Markdown action (Prettier) was run directly with an existing installation,
and the staged line-limit check was run separately; commit uses `HUSKY=0`.
No tooling was installed. Full lint/typecheck/application suites and Mintlify
`docs:check` were not run for this prose-only change.

The first push ran the pre-push unit-test hook and failed before test execution:
`vitest: command not found` (no installed dependencies). This is an environment
limit, not a passing test or an observed application failure. The documentation
branch is pushed with `HUSKY=0` after the targeted checks above.
