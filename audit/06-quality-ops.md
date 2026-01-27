# Audit 06: Quality, Maintainability & Ops

## 1. Testing Gaps

- **Status**: ✅ Unit tests pass (412 tests).
- **Gap**: Integration tests for Database constraints are weak if Typechecks fail.
- **Critical Gap**: `packages/offline-core` typecheck exits with code 2. A broken package implies no confidence in offline functionality.

## 2. Maintainability (DX)

- **Linting**: Running but slow.
- **Type Safety**: **BROKEN**.
  - `packages/email-templates` has dependency issues (`postcss`).
  - `packages/offline-core` fails compilation.
  - **Impact**: Developers cannot trust IDE errors or `tsc`. This is #1 priority to fix for velocity.

## 3. Error Handling

- **Backend**: Uses `Result<T, E>` pattern (Rust-like). This is excellent for predictability.
- **Frontend**: Uses `useApiErrorToast`. Good consistency.
- **Risk**: `catch (error)` in `accounting.usecases.ts` just wraps in `ValidationError`.
  ```typescript
  catch (error) { return err(new ValidationError((error as Error).message)); }
  ```
  This might mask unexpected system errors (DB connection lost) as "Validation Error", confusing the client/metrics.

## 4. Logging & Observability

- **Good**: `LoggerPort` is injected into Use Cases.
- **Gap**: Are logs structured? Do they include `traceId`?
- **Audit Logs**: The "Audit Trail" requirement implies creating `AuditLog` entries.
  - In `accounting.usecases.ts`, `PostJournalEntry` creates an entry but **does not appear to emit an audit log event**.
  - This might violate the "Bizflow Foundation" rules for sensitive data.

## 5. Ops / Migrations

- **Prisma**: Migrations exist.
- **Check**: Ensure `prisma validate` runs in CI to prevent drift.
