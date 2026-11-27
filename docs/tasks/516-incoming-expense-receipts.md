# #516 Incoming expense receipts

## Tracking and outcome

- [#516](https://github.com/Corely-AI/corely/issues/516) under [#342](https://github.com/Corely-AI/corely/issues/342).
- Branch `516-incoming-expense-receipts` for `development` at `7abcef76f`. The scoped implementation request covered this receipt intake slice. The broader Expenses promotion remains tracked in [#334](https://github.com/Corely-AI/corely/issues/334).
- Reuses the Resend receiving transport from [#509](https://github.com/Corely-AI/corely/issues/509), private Documents originals, and Expense create and submit policy. It stores incomplete drafts in scoped extension storage so missing monetary data cannot enter reporting. Native expenses are created when the claimant submits.
- Shared-address receipts wait in a reviewer-only queue. The personal address binds assignment to an authenticated member and is checked against current workspace and expense permissions.

## Verification

- Disposable PostgreSQL and signed synthetic deliveries exercised mixed attachments, partial retry, replay, private original access, assignment, workspace isolation, disabled intake, and concurrent submission. Resend download and object storage used test doubles.
- Ten targeted checks passed across the receipt and invoice email integration tests and the existing create, list and transition unit tests.
- The API build and API, web, contracts and config typechecks passed. The running local API rejected unsigned delivery and accepted a signed unknown-recipient event without an import.
- The repository-wide architecture checker matched the base. The repository-wide formatting check flagged files outside this change.
- See [provider setup](../backend/incoming-expense-receipts.md) for live activation. No new database migration is required.

## UI evidence

Route-mocked Chromium verified the English Backoffice settings, inbox assignment, private original, draft save, and submission. Desktop was 1440 × 900 and phone was 390 × 844.

- [Workspace receipt settings](516-assets/email-settings.webp)
- [Review and submit the draft](516-assets/review.webp)
- [Submitted receipt on phone](516-assets/submitted-phone.webp)
