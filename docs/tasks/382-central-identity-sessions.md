# 382 — Corely-native SSO and per-app session design

## Tracking and outcome

- Issue: [#382 / SURF-02](https://github.com/Corely-AI/corely/issues/382); parent [#380](https://github.com/Corely-AI/corely/issues/380).
- Hard prerequisite: architecture/reuse evidence merged in [#406](https://github.com/Corely-AI/corely/pull/406); [#381 host approval](https://github.com/Corely-AI/corely/issues/381#issuecomment-6724086565) explicitly recorded on 2026-11-08 with closure instructed. ADR-0003 approval follow-up is [#407](https://github.com/Corely-AI/corely/pull/407).
- Branch: `382-central-identity-sessions`; PR base: verified `development` on `corely` (`Corely-AI/corely`).
- PR: [Draft #405](https://github.com/Corely-AI/corely/pull/405).
- Outcome: [ADR-0004](../decisions/ADR-0004-central-identity-app-sessions.md) specifies Corely-native central SSO, per-app sessions, the existing auth trace, five sequences, abuse cases and compatible migration/rollback.
- This ticket delivers the design; runtime delivery stays in [#384](https://github.com/Corely-AI/corely/issues/384), [#385](https://github.com/Corely-AI/corely/issues/385), [#386](https://github.com/Corely-AI/corely/issues/386) and [#387](https://github.com/Corely-AI/corely/issues/387), on separate ticket branches/PRs.
- Exclusions: provider provisioning, live routing, migrations, POS/portal migration, deployment and roadmap promotion.

## Reuse and decisions

Inspected baseline `3a3492196497d38da088b5222b96cd42bd01ad21`, matching fetched
`corely/development` on 2026-11-08. Working tree was clean. No existing #382 PR
was found initially. This branch was created independently from that base.

Identity owns existing users, memberships, password verification, custom JWTs,
refresh and tenant switching. Shared AuthClient/WebStorageAdapter persist browser
tokens; POS uses native SecureStore with a web localStorage fallback. Portal has
a separate OTP/cookie flow. Preserve those identities and old-client contracts.
Source links and limits are recorded in the ADR; no runtime vulnerability is claimed.

The requesting maintainer initially approved PR #405's design at
`175a61cceaf9cb087afb1752480073ad4865cd52` with “approve and continue”. After
clarifying the infrastructure cost, the maintainer instructed: “use corely auth
as SSO, add more code if needed”. This supersedes the Keycloak selection and
keeps cross-app SSO in scope. The revised ADR uses the existing Identity/API
runtime, central session families and one-time app-bound handoffs. It does not
claim those extensions are already implemented or interoperable OAuth/OIDC.

Reconciled the host mismatch against parent #380 and SURF-01 PR #406 at
`e3754d5758ef1d5840e72e04308df34a66643d45`: use `app.corely.one`,
`invoice.app.corely.one` and `hr.app.corely.one`; withdraw the shorter alternative
hosts. Preserve #381's staged root cutover and legacy auth/deep-link routing.
New session endpoints use `/api/session/*` and `/api/bff/*`, without taking over
all legacy `/auth/*` or `/api/*` routes. No other branch's files were copied.

## Verification

| Check                                                              | Result and limits                                                                                                                                                                                                                                                                                                                                                                        |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Default/base and source                                            | GitHub default and fetch verified development at inspected baseline.                                                                                                                                                                                                                                                                                                                     |
| Current auth trace                                                 | Identity, shared client, native POS storage and portal auth reviewed; not a deployed/client inventory.                                                                                                                                                                                                                                                                                   |
| Prettier                                                           | Existing installed gateway Prettier used on all three changed Markdown files; passed; no tooling installed.                                                                                                                                                                                                                                                                              |
| Local links and whitespace                                         | Targeted local path validation and staged whitespace passed; refreshed counts recorded in PR.                                                                                                                                                                                                                                                                                            |
| Source line limit                                                  | `node scripts/check-staged-line-limit.mjs` passed.                                                                                                                                                                                                                                                                                                                                       |
| Five sequence diagrams                                             | Manual participant/branch review; no browser rendering or protocol execution claimed.                                                                                                                                                                                                                                                                                                    |
| Local pre-push unit hook                                           | Failed before test execution: `vitest: command not found`; checkout has no node_modules. Applicable Markdown hook checks ran directly; commits/push use `HUSKY=0`.                                                                                                                                                                                                                       |
| CI on pre-revision head 175a61cce                                  | Cash integration passed. Quality/typecheck failed with missing generated Prisma exports. Unit job failed loading `.prisma/client/default`. Browser E2E failed before running tests because workflow invokes absent `e2e:smoke`. See [run](https://github.com/Corely-AI/corely/actions/runs/42499876814). These are observed pre-revision failures, not a fresh base-branch reproduction. |
| Vercel previews                                                    | Seven statuses failed on the provider's daily deployment quota, not an established source regression; no hosting upgrade/config change attempted.                                                                                                                                                                                                                                        |
| Runtime SSO/security tests, full local lint/typecheck and Mintlify | Not run for documentation-only delivery; required native-protocol outcomes remain future tests.                                                                                                                                                                                                                                                                                          |

Prettier executable:
`/Users/hadoan/Documents/sennder/truckerpoints-gateway/node_modules/prettier/bin/prettier.cjs`.

## UI/UX evidence

N/A: no interface or runtime authentication behavior changed. Diagrams specify
future flows and do not substitute for the implementation tickets' UI evidence.

## Impact and remaining work

The selected architecture needs no external identity server or account migration;
it does require new Corely authentication/session code and operational validation.
#382 records that decision, while #384–387 own implementation. The architecture
inventory is integrated in #406; the maintainer's
[recorded host-plan approval](https://github.com/Corely-AI/corely/issues/381#issuecomment-6724086565)
selects the three requested hosts and authorizes closing #381. Both ADRs use the
same callback/logout paths; #407 records the ADR-0003 status follow-up. No repeat
host approval is pending.

Keep PR #405 Draft and #382 open while its own required checks and delivery remain
unresolved; do not retain the resolved host choice as a blocker. User selection is recorded without inventing specialist review,
GitHub approval, completed registration, merge or deployment. Reverting this
PR's documentation is its entire rollback. Do not bypass failing CI or broaden
this auth design ticket into unrelated workflow repair.

Host-approval follow-up: isolated branch `382-record-host-approval` starts at
`6baeb96ee14514c192a444a6a928351d73c5f462` and advances the existing #405
head only with approval/index/task wording. Corely-native SSO protocol content
is preserved. Formatting, local references, exact host/callback agreement and
whitespace were checked; no runtime tests or deployments were performed.
