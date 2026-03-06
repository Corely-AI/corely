# Tax Module — Roadmap

> Last updated: 2026-03-03

---

## Completed (this iteration)

| Area                                           | Status  | Notes                                       |
| ---------------------------------------------- | ------- | ------------------------------------------- |
| Domain error codes (`Tax:*`)                   | ✅ Done | 7 `AppError` subclasses                     |
| Filing status state machine                    | ✅ Done | `assertFilingTransition` + guards           |
| `JurisdictionPackRegistryPort`                 | ✅ Done | `InMemoryJurisdictionPackRegistry`          |
| DE pack moved to `infrastructure/packs/de/v1`  | ✅ Done | `packId: "de-v1"`                           |
| `TaxSnapshot.packId` field                     | ✅ Done | Nullable, backward-compatible               |
| `TaxDocumentLink` model                        | ✅ Done | Tax links to Documents, doesn't own storage |
| `TaxFilingEvent` model                         | ✅ Done | Domain event log                            |
| OutboxPort integration in SubmitTaxFiling      | ✅ Done | `TaxFilingSubmitted` event emitted          |
| OutboxPort integration in MarkTaxFilingPaid    | ✅ Done | `TaxFilingPaid` event emitted               |
| OutboxPort integration in RecalculateTaxFiling | ✅ Done | `TaxFilingRecalculated` event emitted       |
| AuditPort in SubmitTaxFiling + MarkPaid        | ✅ Done | `tax_filing.submitted`, `tax_filing.paid`   |
| COMPANY strategy with `capabilities`           | ✅ Done | DE VAT-only, structured capabilities        |
| Strategy `capabilities` field                  | ✅ Done | `strategyId` + `TaxStrategyCapabilities`    |
| Layered `TaxCapabilitiesService`               | ✅ Done | env + strategy layers                       |
| `GetTaxCapabilitiesUseCase` with workspaceId   | ✅ Done | Passes context through                      |
| `PaymentProviderPort`                          | ✅ Done | Noop adapter (manual proof)                 |
| `TaxDocumentLink` contracts schema             | ✅ Done | In `@corely/contracts`                      |
| `TaxCapabilities` contracts schema             | ✅ Done | Updated with `strategy` field               |
| State machine unit tests                       | ✅ Done | Fast, no DB                                 |

---

## Near-term (next PRs)

### 1. Move Raw Prisma from RecalculateTaxFiling to Repo Ports

**Status**: Known violation in `RecalculateTaxFilingUseCase`.

**Action**: Add `backfillSnapshotsForPeriod(opts)` to `TaxSnapshotRepoPort`.

```typescript
// domain/ports/tax-snapshot-repo.port.ts
abstract backfillExpenseSnapshots(opts: {
  tenantId: string;
  periodStart: Date;
  periodEnd: Date;
}): Promise<number>; // count of upserted snapshots
```

**Risk**: Medium — requires Prisma repo adapter update + test.

---

### 2. DE Pack Golden Tests

**Status**: Placeholder test file spec defined in plan, not yet implemented.

**File**: `__tests__/de-pack-v1.golden.spec.ts`

**Priority**: High — ensures pack correctness before adding AT/FR.

---

### 3. Real COMPANY Strategy Summary

**Status**: `CompanyTaxStrategy.computeSummary` returns placeholder.

**Action**: Implement company VAT summary using the same `VatPeriodQuery` + `TaxReportRepo` approach as `PersonalTaxStrategy`.

**Scope**: VAT aggregation only. Corporate income tax: separate track.

---

### 4. TaxDocumentLink Repo Adapter + Endpoint

**Status**: Prisma model exists (`TaxDocumentLink`), no adapter or endpoint yet.

**Action**:

1. Create `PrismaTaxDocumentLinkRepoAdapter` in `infrastructure/prisma/`
2. Add `GET /tax/filings/:id/documents` and `POST /tax/filings/:id/documents` endpoints
3. Use `TaxDocumentLinkEntityType` from contracts

---

### 5. Standard List Response Shape

**Status**: Filing list returns raw items without `pageInfo`.

**Target response**:

```json
{
  "items": [...],
  "pageInfo": { "page": 1, "pageSize": 20, "total": 47, "hasNextPage": true }
}
```

**Action**: Update `ListTaxFilingsUseCase` and `ListTaxPaymentsUseCase` to return `{ items, pageInfo }`.

---

### 6. Frontend Idempotency + Capabilities Gating

**Status**: Frontend `tax-api.ts` does not yet send `Idempotency-Key`.

**Action**:

1. Add `idempotencyKey?: string` param to `submitFiling()`, `markFilingPaid()`, `createFiling()`.
2. Gate `Submit` / `Mark Paid` / `Delete` actions on `capabilities.strategy.canFileVat`.
3. Update React Query keys to match defined key factory.

---

## Medium-term

| Item                                                 | Priority | Notes                                   |
| ---------------------------------------------------- | -------- | --------------------------------------- |
| Austria (AT) jurisdiction pack                       | High     | Similar VAT rates to DE, good test case |
| France (FR) jurisdiction pack                        | Medium   | Different VAT structure                 |
| OSS (One-Stop-Shop) support                          | Medium   | For EU e-commerce                       |
| Real payment provider adapter (SEPA credit transfer) | Medium   | Replaces noop                           |
| Per-workspace tax capability flags                   | Medium   | `WorkspaceTaxSettingsPort` extension    |
| Tax PDF generation improvement                       | Low      | Currently basic                         |
| Bulk filing creation from VAT periods                | Low      | Convenience feature                     |

---

## Architecture Decisions

### ADR-001: Tax files don't own storage

**Decision**: Tax module never writes to object storage directly. It links existing document IDs via `TaxDocumentLink`.
**Rationale**: Storage is owned by Documents module to avoid duplication and access-control complexity.

### ADR-002: Filing status machine in domain

**Decision**: `assertFilingTransition` lives in `domain/entities/tax-filing-status.ts`.
**Rationale**: The state machine is pure domain logic with no external dependencies — testable without any infrastructure.

### ADR-003: JurisdictionPackRegistryPort as abstract class / in-memory adapter

**Decision**: Registry is built in-memory at startup with packs registered by the NestJS module constructor.
**Rationale**: No need for DB-backed registry at this scale; packs are code artifacts, not runtime data. Versioning via semver + `packId` string.

### ADR-004: OutboxPort for domain events (fire-and-forget)

**Decision**: Outbox events in tax use cases are enqueued outside the DB transaction for now.
**Rationale**: Tax module uses `PrismaService` directly (not `UnitOfWork`) for historic reasons. Transactional outbox is a future migration.
**Risk**: Low — events are best-effort notifications; filing state is already persisted before enqueue.

### ADR-005: AppError subclasses over kernel UseCaseError

**Decision**: Tax errors extend `AppError` from `@corely/domain`, not the kernel's `UseCaseError`.
**Rationale**: `AppError` gives us stable HTTP status, `code`, `publicMessage` — exactly what RFC7807 needs. `UseCaseError` is mapped to 400 by default. Tax errors need 404, 409, 422, 403.
