# Screen Naming Standard (Web)

Scope: Route-level screens under `apps/web/src/modules/*/screens` that are rendered directly by React Router. Components that are not mounted as pages (small widgets, dialogs, side panels) are out of scope.

## Rules

- **File names**: PascalCase, suffixed with `Page.tsx`.
- **Component names**: Match file name (default export or named export).
- **Placement**: Keep screens in `modules/<module>/screens/`. Do not move shared UI into `shared/`.
- **Pluralization**: Use plural for list screens (`ExpensesPage`, `InvoicesPage`). Use singular for entity screens (`ExpenseDetailPage`, `NewExpensePage`).
- **Acronyms**: Preserve casing already used across repo (`VATReportPage` if added later).
- **Multi-word entities**: Concatenate with capitalization (`TaxReportDetailPage`).
- **Barrel exports**: If a module exposes screens via `index.ts`, export using the standardized component names/paths.

## Canonical patterns

- **List**: `<Resources>Page` (plural) — e.g., `ExpensesPage.tsx`, component `ExpensesPage`.
- **Detail**: `<Resource>DetailPage` (singular + Detail) — e.g., `ExpenseDetailPage.tsx`.
- **Create**: `New<Resource>Page` — e.g., `NewExpensePage.tsx`.
- **Edit**: Prefer reuse of create/detail when possible. If a dedicated edit screen exists, name `Edit<Resource>Page.tsx`.
- **Shared upsert** (optional): `<Resource>FormPage.tsx` with thin `New<Resource>Page`/`Edit<Resource>Page` wrappers if needed.

## Routing guidance

- Keep existing paths stable; add alias routes if you introduce new paths.
- Ensure an edit URL exists (`/<resources>/:id/edit`) even if it reuses detail/upsert screen.
- Create URL remains `/ <resources>/new`.

## Migration notes

- Rename route-level files/components to the patterns above.
- Update imports/exports and router entries to match the new names.
- Avoid renaming non-screen components; only files that are mounted in routes.
