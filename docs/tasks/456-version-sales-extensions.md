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
