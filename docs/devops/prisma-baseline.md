# Adopt the Prisma migration baseline

`0_init` is the PostgreSQL baseline for the 90 migrations at Corely commit
`606ccee8a43a58f85372bb38c83bfd27d5d9bd33`. It captures the resulting schema,
including SQL-only indexes and constraints, and recreates the historical CRM
channel and public restaurant reference records.

## Fresh database

Set `DATABASE_URL` to the intended database through the environment and run the
normal migration command from the repository root.

```sh
pnpm prisma:migrate
```

## Existing Corely database

Adopt the baseline before deploying any release that includes it. Coordinate
the migration jobs for that database and take a verified backup.

1. In a checkout of `606ccee8a43a58f85372bb38c83bfd27d5d9bd33`, run
   `pnpm --filter @corely/data exec prisma migrate status` against the target.
   On a database with a partial history, review and apply its outstanding legacy
   migrations from that checkout after checking application compatibility.
   Investigate any failed migration first.
2. Compare the target schema against a fresh database built from `0_init`.
   Use the same `pg_dump` client for both and compare schema-only output without
   ownership, grants, or Prisma's ledger. For a managed database, include only
   Corely's schemas and `public`. Investigate any difference before recording
   the baseline, including schema changes applied outside Prisma.
3. In the checkout that contains `0_init`, mark it as applied. Skip `resolve`
   if the ledger already records a successful `0_init`. Keep the historical
   entries in `public._prisma_migrations`.

   ```sh
   pnpm --filter @corely/data exec prisma migrate resolve --applied 0_init
   pnpm prisma:migrate
   pnpm --filter @corely/data exec prisma migrate status
   ```

4. Verify a database-backed API path and read back a representative application
   record before completing the release.

Limit `prisma migrate reset` to disposable local databases.

## Schema differences already present

The baseline matches the historical SQL replay. Prisma's comparison with the
current model files reports the same cash-management differences on both
databases. These include `CashMovementResolution`, the `consumedEntryId` column
on `cash_day_confirmations`, and three index names. Address those differences in
a separate migration.

See the [Prisma baselining guide](https://www.prisma.io/docs/orm/prisma-migrate/workflows/baselining).
