# 311 request decision inbox

[Issue #311](https://github.com/Corely-AI/corely/issues/311) depends on
[#310](https://github.com/Corely-AI/corely/issues/310) for decisions and handoffs
and [#303](https://github.com/Corely-AI/corely/issues/303) for the
operational shell. This branch is stacked on
[#541](https://github.com/Corely-AI/corely/pull/541). The underlying Backoffice
route works on that base; OpenBuk can hand off once the
[#303 shell](https://github.com/Corely-AI/corely/issues/303) integrates.
Retarget and recheck after both prerequisites integrate into `development`.

Requests owns the data, read and reviewer authorization and due reminder
eligibility. Approvals owns routing definitions. Notifications owns message
and recipient storage and deduplication. Background delivery stays in the
existing outbox. There is no migration.

See [the Requests backend notes](../backend/operational-requests.md) for
behavior and the linked Draft PR for executed checks and browser evidence.

## Verification

The disposable PostgreSQL suite passed seven tests, and ten AppModule and
dependency-injection checks passed. API and web builds and typechecks passed.
A Chromium fixture-based browser test submitted a request, switched to the
assigned reviewer, confirmed the decision and reconciled both lists. The
same flow checked loading with reduced motion, filtering, partial
unavailability, a mobile viewport and revoked access.

- [Desktop inbox](311-assets/desktop-inbox.png)
- [Desktop loading](311-assets/desktop-inbox-loading.png)
- [Mobile partial availability](311-assets/mobile-inbox-unavailable.png)
