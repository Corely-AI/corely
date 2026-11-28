# Backoffice invoice links

Invoices open directly under `/invoices`, `/invoices/new`, `/invoices/:id` and `/invoices/:id/edit`. The audit page uses `/audit`. Existing links retain the workspace selection and the list query. Each API request still requires workspace access.

The shared web artifact also serves the existing Invoice SSO origin for installed links. Its origin-specific entry uses the cookie-backed BFF. The Backoffice invoice screen uses the current Backoffice workspace session.

Run the browser regression with `pnpm --dir apps/e2e exec playwright test --config playwright.invoice-links.config.ts`. See the [deployment guide](../architecture/architect.md#back-office-deployment) for host and callback routing.
