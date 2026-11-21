# 445 Versioned CRM extensions

[Ticket #445](https://github.com/Corely-AI/corely/issues/445) is part of [rollout #440](https://github.com/Corely-AI/corely/issues/440).
The existing CRM feature routes in Backoffice use the shared Deal screen. The loss
action resolves the tenant-owned Deal through CRM's repository and invokes the
policy before updating the Deal or cancelling sequence enrollments. Party stays
the shared customer record owner.

Register customer loss-reason rules by tenant in the API's crm-extensions.ts.
The current Deal record is tenant-owned, so the same policy applies in every
workspace of that tenant. Configure the matching guidance in the Backoffice
crm-ui-extensions.tsx. The shared loss dialog renders the contribution for the
loaded Deal's tenant. The API remains the authority for validation and writes.

The [fixture manifests](../testing/fixtures/crm-upgrade/) record the backend, UI
and API contract versions and the example extension's peer range. Use the common
preview in [#446](https://github.com/Corely-AI/corely/pull/446) to check them before
deploying. Retain the previous API and web build as a pair for recovery. This
change introduces no database migration.

## Verification

The scoped loss tests exercise rejection before writes, valid loss,
preserved Party references, and sequence cancellation.
