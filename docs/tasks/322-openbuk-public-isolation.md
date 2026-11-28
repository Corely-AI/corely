# 322 Public booking isolation and request limits

- Issue [#322](https://github.com/Corely-AI/corely/issues/322), parent [#286](https://github.com/Corely-AI/corely/issues/286).
- Branch `322-openbuk-public-isolation` targets #319’s private guest management branch.

## Scoped changes

- Workspaces rechecks the authoritative publication row inside OpenBuk checkout, guest moves and cancellations, and legacy hold/confirmation transactions. The row lock serializes closure with booking writes. A resolved request still needs a workspace with booking explicitly published when it acquires the lock.
- Registered OpenBuk studios continue to reject the legacy routes before loading any booking. Legacy catalog and staff reads honor the trusted workspace while preserving tenant-wide offerings. Legacy confirmation reads return only the existing public summary fields with customer name and email unset.
- Public OpenBuk requests share a PostgreSQL budget of 60 requests per minute per peer bucket. Legacy booking availability, holds, confirmation and summary share a separate budget of 30. The API returns 429 with `Retry-After` when the window is full and 503 if PostgreSQL cannot claim a budget. Bookings retain their original idempotency rules and can retry with the same key when capacity returns.
- The limiter uses Express’s server-derived address and ignores raw forwarded headers. Each budget uses a bounded 65,536-key counter space without storing raw IP addresses. Different peers can share a bucket. The same proxy peer shares a budget unless Express trust is configured for the verified ingress. Confirm the effective trusted client address and edge controls before a public pilot.

The scoped review covered public workspace resolution, legacy exclusion,
token validation and replay, write publication, and bounded database accounting.
Cloud ingress and production availability remain outside local evidence.

## Verification

Use the isolated `OPENBUK_TEST_DATABASE_URL`, then run:

```sh
pnpm --dir services/api exec vitest run --config vitest.openbuk.config.ts --maxWorkers=1 --minWorkers=1
```

The suite includes the published-to-private write check, separate database
connections contending for one budget, window reset, scoped legacy selection,
guest credential tests, and Booking concurrency and replay.
