import type { InvoiceAggregate } from "./invoice.aggregate";
import type { InvoiceAction } from "./invoice-capabilities.builder";

export function buildInvoiceActions(invoice: InvoiceAggregate): InvoiceAction[] {
  const actions: InvoiceAction[] = [];
  const { status, totals, id } = invoice;
  const hasDue = totals.dueCents > 0;

  switch (status) {
    case "DRAFT":
      // Primary: Issue Invoice (via transition, but also as action button)
      actions.push({
        key: "issue",
        label: "Issue Invoice",
        icon: "FileCheck",
        placement: "primary",
        enabled: invoice.lineItems.length > 0 && Boolean(invoice.customerPartyId),
        reason: invoice.lineItems.length === 0 ? "Add at least one line item" : undefined,
        dangerous: false,
        endpoint: { method: "POST", path: `/invoices/${id}/finalize` },
      });

      // Overflow: Duplicate, Cancel
      actions.push({
        key: "duplicate",
        label: "Duplicate",
        icon: "Copy",
        placement: "overflow",
        enabled: true,
        dangerous: false,
      });
      break;

    case "ISSUED":
      // Primary: Record Payment (if has balance due)
      actions.push({
        key: "record_payment",
        label: "Record Payment",
        icon: "CreditCard",
        placement: "primary",
        enabled: hasDue,
        reason: hasDue ? undefined : "No outstanding balance",
        dangerous: false,
      });

      // Secondary: Send Email
      actions.push({
        key: "send",
        label: "Send",
        icon: "Mail",
        placement: "secondary",
        enabled: true,
        dangerous: false,
        endpoint: { method: "POST", path: `/invoices/${id}/send` },
      });

      // Secondary: Download PDF
      actions.push({
        key: "download_pdf",
        label: "Download PDF",
        icon: "Download",
        placement: "secondary",
        enabled: true,
        dangerous: false,
        endpoint: { method: "GET", path: `/invoices/${id}/pdf` },
      });

      // Overflow actions
      addCommonOverflowActions(actions, invoice);
      break;

    case "SENT":
      // Primary: Record Payment (if has balance due)
      actions.push({
        key: "record_payment",
        label: "Record Payment",
        icon: "CreditCard",
        placement: "primary",
        enabled: hasDue,
        reason: hasDue ? undefined : "No outstanding balance",
        dangerous: false,
      });

      // Secondary: Resend Email
      actions.push({
        key: "resend",
        label: "Resend",
        icon: "Mail",
        placement: "secondary",
        enabled: true,
        dangerous: false,
        endpoint: { method: "POST", path: `/invoices/${id}/send` },
      });

      // Secondary: Download PDF
      actions.push({
        key: "download_pdf",
        label: "Download PDF",
        icon: "Download",
        placement: "secondary",
        enabled: true,
        dangerous: false,
        endpoint: { method: "GET", path: `/invoices/${id}/pdf` },
      });

      // Secondary: Send Reminder
      actions.push({
        key: "send_reminder",
        label: "Send Reminder",
        icon: "Bell",
        placement: "overflow",
        enabled: Boolean(invoice.billToEmail),
        reason: invoice.billToEmail ? undefined : "Customer email required",
        dangerous: false,
      });

      // Overflow actions
      addCommonOverflowActions(actions, invoice);
      break;

    case "PAID":
      // Secondary: Download PDF
      actions.push({
        key: "download_pdf",
        label: "Download PDF",
        icon: "Download",
        placement: "secondary",
        enabled: true,
        dangerous: false,
        endpoint: { method: "GET", path: `/invoices/${id}/pdf` },
      });

      // Overflow actions (no cancel for paid)
      actions.push({
        key: "duplicate",
        label: "Duplicate",
        icon: "Copy",
        placement: "overflow",
        enabled: true,
        dangerous: false,
      });
      actions.push({
        key: "view_audit",
        label: "View Audit Log",
        icon: "History",
        placement: "overflow",
        enabled: true,
        dangerous: false,
        href: `/audit?entity=invoice&id=${id}`,
      });
      break;

    case "CANCELED":
      if (invoice.number && invoice.issuedAt && invoice.payments.length === 0) {
        actions.push({
          key: "create_correction",
          label: "Create correction draft",
          icon: "Copy",
          placement: "primary",
          enabled: true,
          dangerous: false,
        });
      }
      // Secondary: Download PDF (for records)
      actions.push({
        key: "download_pdf",
        label: "Download PDF",
        icon: "Download",
        placement: "secondary",
        enabled: true,
        dangerous: false,
        endpoint: { method: "GET", path: `/invoices/${id}/pdf` },
      });

      actions.push({
        key: "view_audit",
        label: "View Audit Log",
        icon: "History",
        placement: "overflow",
        enabled: true,
        dangerous: false,
        href: `/audit?entity=invoice&id=${id}`,
      });
      break;
  }

  return actions;
}

function addCommonOverflowActions(actions: InvoiceAction[], invoice: InvoiceAggregate): void {
  const { id } = invoice;
  actions.push({
    key: "duplicate",
    label: "Duplicate",
    icon: "Copy",
    placement: "overflow",
    enabled: true,
    dangerous: false,
  });

  actions.push({
    key: "export",
    label: "Export",
    icon: "FileSpreadsheet",
    placement: "overflow",
    enabled: true,
    dangerous: false,
  });

  actions.push({
    key: "view_audit",
    label: "View Audit Log",
    icon: "History",
    placement: "overflow",
    enabled: true,
    dangerous: false,
    href: `/audit?entity=invoice&id=${id}`,
  });

  // Danger: Cancel (added via transitions, but can also be in actions for overflow menu)
  const canCancel = invoice.status !== "PAID" && invoice.status !== "CANCELED";
  const hasPayments = invoice.payments.length > 0;

  if (canCancel) {
    actions.push({
      key: "cancel",
      label: "Cancel Invoice",
      icon: "XCircle",
      placement: "danger",
      enabled: !hasPayments,
      reason: hasPayments ? "Cannot cancel invoice with recorded payments" : undefined,
      dangerous: true,
      confirmTitle: `Cancel Invoice ${invoice.number}?`,
      confirmMessage: "This will void the invoice. This action cannot be undone.",
      requiresInput: "reason",
      endpoint: { method: "POST", path: `/invoices/${id}/cancel` },
    });
  }
}
