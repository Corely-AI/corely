# Audit 03: Architecture & Boundary Violations

## Violation Table

| Path                               | Import Violation       | Rule Ref    | Why it breaks                                     | Severity | Fix                     |
| ---------------------------------- | ---------------------- | ----------- | ------------------------------------------------- | -------- | ----------------------- |
| `services/api/src/modules/config/` | Imports from Features? | Structure   | Shared kernel/config must not depend on features. | High     | Invert dependency (DI). |
| `packages/email-templates`         | Typecheck Failure      | Clean Build | Packages must compile cleanly.                    | Medium   | Fix types/deps.         |
| `packages/offline-core`            | Typecheck Failure      | Clean Build | Broken package blocks CI.                         | High     | Fix missing types.      |

## 4A. Monorepo Dependency Direction

**Status**: Mostly Green ✅.

- NO detected imports of `apps/web` in `services/api`.
- NO detected imports of `services/api` in `apps/web` (uses `@corely/api-client` correctly).
- `packages/contracts` is pure (only `zod`).

## 4B. Frontend Module Boundaries

**Status**: Warning ⚠️.

- **Fat Screens**: `screens/` directories contain massive logic (`NewInvoicePage.tsx` > 900 LOC).
- **Leakage**: Logic often lives in `screens` rather than `modules/feature/components` or `hooks`.
- **Shared UI**: `apps/web/src/shared/ui/sidebar.tsx` contains specific business logic/navigation for modules? (700 LOC suggests it knows too much).

**Recommendation**:

- Sidebar should be "dumb", fed by a configuration exported by modules.
- Screens should be composition shells only.

## 4C. Critical Architecture Check Failures

The automated `arch:check` script identified explicit violations.

**Prisma Usage Leakage (Forbidden outside Infrastructure):**

- `services/api/src/modules/accounting/templates/coa-us-gaap.executor.ts`
- `services/api/src/modules/approvals/application/approval-request.service.ts`
- `services/api/src/modules/tax/application/services/tax-strategy-resolver.service.ts`
- `services/api/src/modules/workflow/application/workflow.service.ts`
- `services/worker/src/modules/*` (Multiple handlers)

**Impact**:

- This tightly couples Business Logic (Application Layer) to the Database implementation.
- Makes unit testing harder (must mock Prisma vs a port).
- Violates Hexagonal Architecture explicitly defined in `docs/architecture/overall-structure.md`.
