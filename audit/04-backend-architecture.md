# Audit 04: Backend Architecture & Domain

## 1. Domain Logic Leakage

- **Violation**: "Service Classes" accessing Prisma directly.
- **Example**: `ApprovalRequestService`, `WorkflowService` flagged by `arch:check`.
- **Reason**: Developers bypassed the Repository abstraction for speed or convenience.
- **Fix**: Create `IApprovalRepository` and `IWorkflowRepository`. Move Prisma calls there.

## 2. God Objects / Anti-Modular Pattern

- **Violation**: `inventory.module.ts` (1103 LOC), `purchasing.module.ts` (870 LOC).
- **Impact**: Breaking module cohesiveness. A NestJS `Module` file should only wire things up. It should not contain implementation.
- **Root Cause**: Likely defining providers, constants, or even helpers inline in the module file.

## 3. "Use Case Bag" Anti-Pattern

- **Violation**: `accounting.usecases.ts` (670 LOC) contains multiple classes (`CreateLedgerAccount`, `UpdateLedgerAccount`, etc.).
- **Impact**:
  - **Cognitive Load**: Hard to scan.
  - **Testing**: Test files `*.usecases.spec.ts` become massive.
  - **Single Responsibility**: The file has multiple responsibilities (managing Accounts, Entries, Periods).
- **Fix**: One file per class. `create-ledger-account.usecase.ts`, `update-ledger-account.usecase.ts`.

## 4. Repository Security (Prisma)

- **Warning**: Repositories manually check `tenantId` in `find` queries but some `update` methods might rely on `id` uniqueness only.
- **Finding**: `PrismaCashRepository.updateRegister` takes `tenantId` but **does not use it in the query** (`where: { id }`).
- **Risk**: Potential Insecure Direct Object Reference (IDOR) if IDs are guessable or leaked.

## 5. Event Driven Architecture

- **Good**: Explicit "Event Catalog" in `docs/backend/EVENTS.md`.
- **Gap**: Ensure `worker` services actually consume these events and are not just theoretical consumers. The `arch:check` flagged worker handlers accessing Prisma directly, which suggests they bypass the domain layer of the API (or duplicate it). This is a "Distributed Monolith" risk.
