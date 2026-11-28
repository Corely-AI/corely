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
