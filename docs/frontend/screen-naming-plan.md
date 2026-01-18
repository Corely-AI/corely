# Screen Naming Plan

Current state (see `screen-naming-as-is.md`) already matches the target naming standard for route-level screens. No file/component renames are required.

Actions:

- Keep existing route paths unchanged.
- Add edit-route aliases (`/:id/edit`) where modules currently use detail pages for editing (customers, invoices, sales quotes/orders/invoices, purchase orders/vendor bills, inventory products/documents, CRM deals).
- When adding new screens, follow the standard in `screen-naming-standard.md`.
- If future modules add edit wrappers, use `Edit<Resource>Page.tsx` or thin wrappers around shared upsert screens.
