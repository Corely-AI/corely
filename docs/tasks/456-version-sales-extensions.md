# 456 Versioned Sales extensions

Sales uses the runtime app ID `sales` and depends on `parties`. The Backoffice
quote detail owns the visible edit and send actions. The modular monolith
continues to own quote persistence, numbering and application commands. Party
owns customers and Invoices owns invoices generated from a quote.

`@corely/sales` contains the existing pure quote lifecycle and totals. Configure
a Send Quote policy in `quote-send-extensions.ts` for the tenant that owns the
quote. The operator's example requires the existing validity date. The rule runs
only for a draft quote, after successful authorized lookup and existing retry
handling, before number allocation or any write. The optional Backoffice guidance
in `quote-send-guidance.ts` uses the tenant of the loaded quote.

Use the [release fixtures](../testing/fixtures/sales-upgrade/) and the common
preview in [#446](https://github.com/Corely-AI/corely/pull/446). Keep the previous
API and web builds as a pair for recovery. This release introduces no migration.

## Verification

The focused policy and aggregate test, API and web builds and typechecks, package
typechecks and frozen install passed.

The same disposable database and policy were used for 1.0 and 1.1. A draft
retained its original Party and total. The Acme policy declined sending without
a date and the quote retained its draft status and empty number. The default
tenant sent without a date. After entering the date, the quote was sent and
replayed with the same number. A converted invoice retained its Party reference
on each version. Converting a second quote to an order also retained its Party
and source quote on 1.1. The preview accepted the 1.1 package pair and rejected
UI 2.0.0. The candidate backend used 1.1.0 and the UI used 1.0.1.

Four Backoffice browser cases passed on each release. The configured desktop
case clicked Send Quote and observed the policy rejection.

| Width   | Default                                                                 | Configured                                                             |
| ------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| 1280 px | [Default desktop](../platform/evidence/sales-upgrade-standard-1280.jpg) | [Configured desktop](../platform/evidence/sales-upgrade-acme-1280.jpg) |
| 390 px  | [Default mobile](../platform/evidence/sales-upgrade-standard-390.jpg)   | [Configured mobile](../platform/evidence/sales-upgrade-acme-390.jpg)   |
