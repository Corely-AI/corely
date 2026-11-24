# 492 — Prisma initial migration baseline

## Tracking and outcome

- [Issue #492](https://github.com/Corely-AI/corely/issues/492).
- Branch `492-prisma-initial-baseline` targets `development` at `606ccee8`.
- Reproduce the existing database initialization from one migration and document
  adoption for databases with application data.

## Reuse and decisions

Use the PostgreSQL state produced by the tracked 90-step migration chain.
Preserve schema objects that Prisma's data model cannot fully represent and
the 16 reference records inserted by the chain. Generate their timestamps
when the baseline is applied.

## Verification

| Check                                              | Result                                                                                                                         |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| PostgreSQL 17 historical replay and fresh `0_init` | Schema-only dumps matched after excluding the Prisma ledger and dump session markers                                           |
| CRM and directory reference records                | All 16 records matched apart from freshly generated timestamps                                                                 |
| PostgreSQL 16 fresh `0_init`                       | `migrate deploy` and `migrate status` passed                                                                                   |
| Existing PostgreSQL 17 database                    | `migrate resolve`, `migrate deploy`, and `migrate status` passed with the old ledger and an edited application record retained |
| `migrate diff` against Prisma models               | Both histories report the same existing cash-management differences                                                            |

## UI/UX evidence

Database migration and operational documentation only.

## Impact and remaining work

Existing environments must complete the historical chain and verify their
schema before adopting `0_init`. See the [adoption guide](../devops/prisma-baseline.md).
