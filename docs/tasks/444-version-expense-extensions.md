# 444 Versioned Expenses extensions

[Ticket #444](https://github.com/Corely-AI/corely/issues/444) is part of [rollout #440](https://github.com/Corely-AI/corely/issues/440).
Expenses owns the submission operation. Backoffice and the Expenses-only route both
use the shared detail screen. Neither custom fields nor dimensions can enforce a
conditional requirement on the existing category field at submission time.

Current expenses use the workspace ID in the storage scope column. Submission reads
that scope from the authenticated request and checks the loaded row's scope before
choosing a customer rule. Existing tenant-keyed records retain their previous
submission behavior. No records or schemas move.

Register a trusted category policy by both tenant and workspace in the API's
expense-extensions.ts. Add guidance for the same workspace in the Backoffice
expense-detail.tsx. The [fixture manifests](../testing/fixtures/expense-upgrade/)
pin the compatible customer package. Run the application compatibility preview from
[#446](https://github.com/Corely-AI/corely/pull/446) before promotion. Keep the prior
API and web artifacts for recovery. This release introduces no migrations.

## Verification

The scoped unit tests exercise submission, pre-write rejection, legitimate retries,
legacy records, another workspace, archive, approval, and payment.

## Reproduce the upgrade

1. Start the API and Backoffice against a migrated disposable database. Create two
   test company workspaces and seed an unclassified draft Expense in each one.
2. Register a category check for the Acme tenant and workspace and matching guidance in the detail screen.
   Keep the second workspace on the defaults. Confirm the Acme action is rejected
   with `Expenses:SubmissionPolicyRejected`. A valid category allows the action.
3. Keep both datasets and leave the fixture registrations unchanged. Bump the app
   and server package to 1.1.0 and the UI package to 1.0.1. Rebuild, confirm the same
   Expense IDs and workspace ownership, and repeat the actions in the two scopes.
4. Run the shared preview without the Booking-specific `--verify` option. Confirm
   the candidate matches both peer ranges. Set a test copy of the UI revision to
   2.0.0 and confirm the compatibility report rejects it.

The unchanged registrations were exercised on both fixture versions using one
disposable PostgreSQL database. In both API builds the existing record remained
readable, the configured action failed before updating, a valid action succeeded
and the default workspace completed the action without the customer rule.
API and web typechecks passed. The preview accepted the candidate and rejected
UI 2.0.0. Four Playwright checks passed on each version at the following widths.

| Width   | Default                                                                    | Configured                                                                |
| ------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| 1280 px | [Default desktop](../platform/evidence/expenses-upgrade-standard-1280.jpg) | [Configured desktop](../platform/evidence/expenses-upgrade-acme-1280.jpg) |
| 390 px  | [Default mobile](../platform/evidence/expenses-upgrade-standard-390.jpg)   | [Configured mobile](../platform/evidence/expenses-upgrade-acme-390.jpg)   |
