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
