# Audit 02: Duplication & Repeated Patterns

## 1. Use Case Boilerplate (High)

**Location**: `services/api/src/modules/*/application/use-cases/*.usecases.ts`

The "Grouped Use Case" pattern forces repetition of boilerplate code for every single use case class defined in the file.

**Examples in `accounting.usecases.ts`:**

- **Tenant Validation**: `if (!ctx.tenantId) { return err(new ValidationError("tenantId is required")); }` repeated in ~10 methods.
- **Dependency Map**: `protected readonly deps: BaseDeps` repeated in `constructor`.
- **Clock**: `const now = this.deps.clock.now()` repeated.

**Recommendation**:

- Move to **1 Use Case per File** pattern.
- Create an `AuthorizedUseCase` base class or decorator that enforces `tenantId` presence automatically.

## 2. Inline DTO Mappers (Medium)

**Location**: Bottom of `*.usecases.ts` and `*repository.adapter.ts`.

Mappers like `mapAccountToDto` and `mapEntryToDto` are defined as module-level functions or private methods.

- **Risk**: They cannot be reused by other modules (e.g., Reporting) or between the Controller and the Use Case (if needed).
- **Result**: Reporting use cases likely re-implement the same logic or duplicate the code.

**Recommendation**: extract to `*.mapper.ts` files (e.g., `LedgerAccountMapper`).

## 3. Pattern Duplication in Lists/Updates (Medium)

**Location**: `Create` vs `Update` methods.

Logic for "creating lines" is often duplicated or slightly varied in `Update` logic (e.g., in `JournalEntry`).

- `CreateJournalEntryUseCase` maps lines -> Entity.
- `UpdateJournalEntryUseCase` maps lines -> Entity (inline map).

**Recommendation**: Extract `LineItemFactory` or factory method on the Domain Aggregate.

## 4. Frontend Component State (Medium)

**Location**: `apps/web/src/modules/*/screens/*.tsx`

Large naming of screens (`NewInvoicePage`, `NewDealPage`) suggests similar patterns for "Creation Pages":

- Form caching/state.
- Validation setup.
- Submission error handling (`useApiErrorToast`).

**Recommendation**: Use a `useCreateResource<T>(...)` hook to standardize the create flow (toast, navigation, error mapping).
