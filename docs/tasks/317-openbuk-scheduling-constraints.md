# 317 Booking compatibility and atomic schedule writes

- Issue [#317](https://github.com/Corely-AI/corely/issues/317), parent [#286](https://github.com/Corely-AI/corely/issues/286).
- Branch `317-openbuk-scheduling-constraints` based on `development` at `3229fd4e`.
- Covers the shared scheduling-write prerequisite for [#318](https://github.com/Corely-AI/corely/issues/318) and [#327](https://github.com/Corely-AI/corely/issues/327). Reuses people availability from [#306](https://github.com/Corely-AI/corely/issues/306). Additional service and staff choices remain with [#316](https://github.com/Corely-AI/corely/issues/316).

## Verification

- API typecheck passed.
- Twenty-eight tests passed across OpenBuk transaction, OpenBuk availability and People availability suites. PostgreSQL cases cover competing writes, live and expired holds, changed-payload retries, scope, original buffers, staff availability changes and rollback when the outbox fails.
- The API changes preserve the existing routes and public checkout. No interface or database schema changes.
