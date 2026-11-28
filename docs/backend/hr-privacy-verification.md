# Focused HR privacy verification

Scope: SURF-17 #398, reviewed November 9, 2026, after the focused HR composition
in #423. This is bounded local verification, not production privacy certification.
The runtime owner remains People; HR remains coming-soon pending normal quality,
review and rollout gates.

## Current authorization model

People permissions come from current role grants in the selected tenant and active
workspace membership. A role named Manager alone grants nothing. The current
`people.profile.manage` permission covers management of staff in that authorized
workspace; no reporting-line-only manager restriction is implemented or claimed.
Private reads/writes and personnel documents require their separate permissions.
A manager who also belongs to another workspace cannot use its context to retrieve
a staff record owned by the first workspace. Tenant IDs and workspace IDs remain
distinct.

Self-service resolves the authenticated account's linked staff record and accepts
only its supported own fields, with subject/version preconditions. Directory and
neutral availability projections omit personnel contacts, absence reasons and
private attachment data. Generic document repositories reserve personnel IDs and
exclude them even when an unrelated relation/public flag is supplied.

## Evidence matrix

| Boundary                 | Actual checks                                                                                                                                                                                                                                                                                                                              |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Invoice-only identities  | New persisted host-session tests deny directory, management, private, absence and pattern retrieval via Invoice BFF, HR BFF and direct JWT APIs; private repository reads never run on denial.                                                                                                                                             |
| Neutral directory/search | Real People list/detail omit account links and private fields; searches for private notes/email return zero matches. There is no general People search-index/export route registered in the reviewed composition; no hypothetical future index is certified.                                                                               |
| Authorized manager scope | Positive private read in the selected workspace; another authorized workspace returns 404 for that record; forged tenant/workspace context returns 403.                                                                                                                                                                                    |
| Self-service             | Existing persisted self/lifecycle suites cover own records, escalation fields, changed subject, replay and disabled workspace access.                                                                                                                                                                                                      |
| Private absence/files    | Existing persisted absence/privacy suites cover neutral Booking effects; permission/workspace/relationship checks; generic, signed, public and background document paths; reauthorization after storage I/O.                                                                                                                               |
| Revocation               | New real host-session tests recheck current grants, disabled workspace membership, disabled account and revoked central family before reading private data.                                                                                                                                                                                |
| Browser account/cache    | New synthetic transport regression displays a private note, changes the authenticated account, triggers foreground verification, then asserts private fields/old profile disappear and unavailable-workspace state resolves. Existing scoped UI tests cover late responses and reauthorization failures.                                   |
| AI/tool retrieval        | Reviewed People module and tool registration: no People/private retrieval tool is registered. Existing operational authorization and tool factory suites verify prompt filtering and reauthorization before handlers; generic personnel document access is denied separately. This does not certify all assistant history or future tools. |
| Audit/outbox             | Existing persisted tests assert private reason/contact values are absent from ordinary directory audit/event payloads. Test logs use synthetic data; browser traces are disabled.                                                                                                                                                          |

## Reproduce

Use disposable local databases only. The existing SSO helper refuses anything
except `127.0.0.1` and a `corely_384_*` database; People fixtures require
`people_test_*`. This run reused the test-owned `corely-397-verification` container,
loopback port 57080, databases `corely_384_hr397` and `people_test_397`. No shared or
production database, real personnel data, external delivery or cloud mutation.

With `SSO_TEST_DATABASE_URL` and `PEOPLE_TEST_DATABASE_URL` set to those disposable
targets:

```sh
pnpm --dir services/api exec vitest run --config vitest.config.ts src/modules/people/__tests__ src/modules/identity/__tests__/operational-access.spec.ts src/modules/ai-copilot/__tests__/tools.factory.spec.ts src/modules/documents/__tests__/personnel-documents.spec.ts
pnpm --dir apps/e2e exec playwright test --config playwright.hr.config.ts
pnpm --dir services/api typecheck
pnpm --dir apps/hr typecheck
```

The API/unit run passed **108 tests across 14 files, no skips**. Six new tests
compose the actual BFF transport, persisted session store, membership policy,
People use cases and persistence. Families/handles are synthetic fixtures seeded
directly; this suite does not claim to test login issuance. The separate browser
suite uses mocked session/API responses. Full browser-to-database and released
CDN/issuer behavior remain #401/#399/#404.

Self-review checked the complete incremental diff, positive authorization controls,
assertions before private reads, cleanup and target guards. No confirmed material
privacy defect was found within these paths. Existing production trust boundaries,
third-party retention and all undeclared retrieval systems remain outside this
verification.
