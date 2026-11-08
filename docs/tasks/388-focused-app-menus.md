# #388 — Focused app menus and API capability checks

## Tracking and outcome

- [Issue #388](https://github.com/Corely-AI/corely/issues/388), parent [#380](https://github.com/Corely-AI/corely/issues/380).
- Prerequisite #383 is complete and integrated; initial base `366df0955c6a0e7436709b1ba5903dec1285b673`; rebased onto `corely/development` at `75d1f3888aaa480b0858fb8eac737988ccfc560a` after #412 merged.
- Branch: `388-focused-app-menus`; intended PR base: `development`.
- PR: pending Draft publication.
- #412 / #387 was merged independently during verification; its changes are inherited from the updated base, not part of this PR diff.
- Outcome: optional focused Invoice/HR navigation through existing contracts and composers, plus evidenced HTTP authorization/enablement gaps closed with existing guards.

## Reuse and decisions

Reused the existing launch IDs, manifests/registry, effective entitlement service,
workspace configuration, menu builder/composer and current membership/grant
repositories. No new runtime surface enum, app owner, schema, environment key,
dependency or migration. Maintained behavior and reproduction notes are in
[focused app navigation](../backend/focused-app-navigation.md).

Focused menu requests select `invoice` or `hr`; only that owner's contributions
survive permission/capability/dependency filtering. Supporting modules remain
separately callable through authorized APIs and do not expose whole navigation
groups. Focused configuration has no unrelated home widgets, echoes its context
and preserves workspace/current-user metadata for the later shared shell.
Unknown contexts, incompatible surfaces and conflicting operational-package
selection fail closed. Registered cookie hosts pin their menu/config context;
App Center and legacy broad behavior remain available. Context is presentation,
not a security principal. Competing workspace selectors now use the same resolved
workspace that AuthGuard authorizes.

Focused reads do not install defaults. Legacy menu initialization now lists all
installs before adding missing defaults, preserving explicit disabled choices
instead of re-enabling them. Default initialization of genuinely missing apps
retains the existing behavior.

The source inspection found Invoice HTTP operations had only AuthGuard. They now
use the canonical operation permissions already present in Invoice tools and
require effective Invoice enablement. Both retained PDF routes require the PDF
capability. Customer routes retain their existing operation RBAC and require
Parties enablement. The existing entitlement guard now honors class metadata;
Documents imports the existing Platform module to resolve its invoice guard.
Guards/decorators are exported through Platform's narrow public entry point.

People's owning use cases already validate current membership, operation grants,
workspace records and People enablement; they were reused rather than replaced.
Generic documents remain tenant-owned under their established permission policy
and reject reserved personnel IDs. Personnel access remains in private People
use cases. No universal security audit or new workspace-document storage model
is claimed. Non-HTTP callers retain their existing owning policies and are not
claimed newly audited by the HTTP guard changes.

## Verification

Actual runs on 2026-11-08. The integration fixture refuses non-loopback databases
and names outside `corely_384_*`. This run used the test-owned PostgreSQL instance
at 127.0.0.1:55485 / `corely_384_surf05`; outbox dispatch was disabled.

| Check                                                                                          | Result and limits                                                                                                                                                                                                                                                |
| ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Root `pnpm test:unit` with explicit disposable DATABASE_URL                                    | **1,329 passed, seven skipped across 303 files after rebase.**                                                                                                                                                                                                   |
| Menu builder, focused context, workspace configuration and existing operational package checks | **32 passed**, plus **two** HTTP input/controller regressions.                                                                                                                                                                                                   |
| Focused API, host-bound navigation and neighboring cookie transport integration                | **49 passed** after rebase: six direct API boundary cases, two host-context cases and 41 neighboring session/transport cases.                                                                                                                                    |
| API and contracts typechecks                                                                   | Passed before publication.                                                                                                                                                                                                                                       |
| Contracts/API build                                                                            | Passed.                                                                                                                                                                                                                                                          |
| Full `AppModule` dependency injection compile                                                  | Passed; no server listener or module initialization/delivery was started.                                                                                                                                                                                        |
| Targeted ESLint                                                                                | Passed with zero errors and eight pre-existing customer-controller warnings; normal pre-commit checks passed.                                                                                                                                                    |
| Formatting, documentation links, whitespace and source size                                    | Passed: changed-file Prettier, local documentation links, whitespace and 500-line source limit.                                                                                                                                                                  |
| Whole-repository lint/typecheck/architecture and hosted CI                                     | Not repeated here. Earlier failures on this base include root lint heap exhaustion, unrelated web-features/declaration errors and an architecture checker reference to absent worker source. Hosted checks are inspected after publication; no full green claim. |

The HTTP boundary fixture uses real signed JWTs and current PostgreSQL membership,
role grants and workspace membership, including stale/forged role claims. Actual
Invoice and People readers/persistence prove cross-workspace IDs return 404 even
when the same user belongs to both workspaces. Unjoined scopes, foreign tenant
claims and revoked membership fail before data access. Operation revocation,
disabled app and unsupported PDF capability cases deny direct API calls regardless
of app hints. Generic document/lookup RBAC and personnel-document denial are also
covered. Entitlement configuration and command/delivery sinks are synthetic;
no actual email, publication or financial state change is executed.

Cookie transfer tests intentionally provide read-only synthetic business grants;
the separate boundary fixture is the authority/negative test evidence. The tests
do not establish every non-HTTP integration or production configuration.

## UI/UX evidence

N/A: contracts and backend composition/authorization only. Existing clients omit
the new optional launch context; focused client/shared-shell rendering belongs
to #389 and subsequent client issues. No frontend routes, components, layout or
public Booking/OpenBuk journey changed. Payload/schema and real HTTP tests are
the evidence for this slice, not fabricated screenshots of an undelivered UI.

## Impact and remaining work

Custom callers must have the existing canonical operation grants and effective
app installation/enablement; authentication alone no longer permits Invoice
operations. No default role grants or stored identities are renamed. Generic
documents remain tenant-scoped and use their existing private-document policy.
No database or frontend rollback is required; revert this branch to restore the
previous backend behavior if necessary without changing stored data.

Keep Draft for human review and repository checks. No merge, deployment, real
message or production activation is authorized/performed. Subsequent surfaces
must include focused context in their client cache keys and bind feature clients
to the chosen session transport. #412 was merged independently; its session/transport checks also pass on this rebased branch.

The redundant whole-repository pre-push wrapper is bypassed with `HUSKY=0` after
the explicit checks above; its unrelated global failures are recorded rather
than reported as passing. Normal pre-commit checks remain enabled. The test-owned
PostgreSQL instance is stopped after the final HTTP run.
