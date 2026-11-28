/**
 * Invoice Capabilities Builder
 *
 * Computes the capabilities contract for an invoice based on its current state.
 * This ensures UI doesn't embed business logic - all rules come from the domain.
 *
 * @see docs/specs/record-command-bar-standard.md
 */

import { type InvoiceAggregate } from "./invoice.aggregate";
import { type InvoiceStatus } from "./invoice.types";
import { buildInvoiceActions } from "./invoice-actions";
import { fractionalQuantityIssueReason } from "./invoice-money";

// -----------------------------------------------------------------------------
// Types (mirroring contracts, but domain-local for computation)
// -----------------------------------------------------------------------------

export type StatusTone = "muted" | "default" | "accent" | "success" | "destructive";

export type InvoiceStatusCapability = {
  value: InvoiceStatus;
  label: string;
  tone: StatusTone;
};

export type BadgeTone = "warning" | "info" | "success" | "muted";

export type InvoiceBadge = {
  key: "OVERDUE" | "PARTIALLY_PAID" | "SENT_DELIVERY";
  label: string;
  tone: BadgeTone;
};

export type InvoiceTransition = {
  to: InvoiceStatus;
  label: string;
  enabled: boolean;
  reason?: string;
  dangerous: boolean;
  confirmTitle?: string;
  confirmMessage?: string;
  requiresInput?: string;
};

export type ActionPlacement = "primary" | "secondary" | "overflow" | "danger";

export type InvoiceAction = {
  key: string;
  label: string;
  icon?: string;
  placement: ActionPlacement;
  enabled: boolean;
  reason?: string;
  dangerous: boolean;
  confirmTitle?: string;
  confirmMessage?: string;
  requiresInput?: string;
  href?: string;
  endpoint?: {
    method: "GET" | "POST" | "PATCH" | "DELETE";
    path: string;
  };
};

export type InvoiceEditability = {
  canEditHeader: boolean;
  canEditDates: boolean;
  canEditLineItems: boolean;
  reason?: string;
};

export type InvoiceAuditInfo = {
  trackChanges: boolean;
  lastModifiedBy?: string;
  lastModifiedAt?: string;
};

export type InvoiceCapabilities = {
  status: InvoiceStatusCapability;
  badges: InvoiceBadge[];
  transitions: InvoiceTransition[];
  actions: InvoiceAction[];
  editability: InvoiceEditability;
  audit: InvoiceAuditInfo;
};

// -----------------------------------------------------------------------------
// Status Configuration
// -----------------------------------------------------------------------------

const STATUS_CONFIG: Record<InvoiceStatus, { label: string; tone: StatusTone }> = {
  DRAFT: { label: "Draft", tone: "muted" },
  ISSUED: { label: "Issued", tone: "default" },
  SENT: { label: "Sent", tone: "accent" },
  PAID: { label: "Paid", tone: "success" },
  CANCELED: { label: "Canceled", tone: "destructive" },
};

// -----------------------------------------------------------------------------
// Capabilities Builder
// -----------------------------------------------------------------------------

export class InvoiceCapabilitiesBuilder {
  private readonly invoice: InvoiceAggregate;
  private readonly now: Date;

  constructor(invoice: InvoiceAggregate, now: Date = new Date()) {
    this.invoice = invoice;
    this.now = now;
  }

  build(): InvoiceCapabilities {
    return {
      status: this.buildStatusCapability(),
      badges: this.buildBadges(),
      transitions: this.buildTransitions(),
      actions: buildInvoiceActions(this.invoice),
      editability: this.buildEditability(),
      audit: this.buildAuditInfo(),
    };
  }

  private buildStatusCapability(): InvoiceStatusCapability {
    const config = STATUS_CONFIG[this.invoice.status];
    return {
      value: this.invoice.status,
      label: config.label,
      tone: config.tone,
    };
  }

  private buildBadges(): InvoiceBadge[] {
    const badges: InvoiceBadge[] = [];
    const { status, totals, dueDate, sentAt } = this.invoice;

    // OVERDUE: status in [ISSUED, SENT] AND dueDate < today AND dueCents > 0
    if ((status === "ISSUED" || status === "SENT") && dueDate && totals.dueCents > 0) {
      const dueDateObj = new Date(dueDate);
      const today = new Date(this.now);
      today.setHours(0, 0, 0, 0);
      dueDateObj.setHours(0, 0, 0, 0);

      if (dueDateObj < today) {
        badges.push({
          key: "OVERDUE",
          label: "Overdue",
          tone: "warning",
        });
      }
    }

    // PARTIALLY_PAID: 0 < paidCents < totalCents
    if (totals.paidCents > 0 && totals.paidCents < totals.totalCents) {
      badges.push({
        key: "PARTIALLY_PAID",
        label: "Partially Paid",
        tone: "info",
      });
    }

    // SENT_DELIVERY: sentAt is set (only show if not already in SENT status to avoid redundancy)
    if (sentAt && status !== "SENT") {
      badges.push({
        key: "SENT_DELIVERY",
        label: "Sent",
        tone: "muted",
      });
    }

    return badges;
  }

  private buildTransitions(): InvoiceTransition[] {
    const transitions: InvoiceTransition[] = [];
    const { status, lineItems, customerPartyId, payments } = this.invoice;

    switch (status) {
      case "DRAFT":
        // DRAFT → ISSUED (Finalize)
        {
          const hasCustomer = Boolean(customerPartyId);
          const hasLineItems = lineItems.length > 0;
          let reason: string | undefined;
          if (!hasCustomer) {
            reason = "Customer is required";
          } else if (!hasLineItems) {
            reason = "At least one line item is required";
          } else if (lineItems.some(({ qty }) => !Number.isInteger(qty))) {
            reason = fractionalQuantityIssueReason;
          }

          transitions.push({
            to: "ISSUED",
            label: "Issue Invoice",
            enabled: !reason,
            reason,
            dangerous: false,
          });
        }

        // DRAFT → CANCELED
        transitions.push({
          to: "CANCELED",
          label: "Cancel Invoice",
          enabled: true,
          dangerous: true,
          confirmTitle: "Cancel this draft invoice?",
          confirmMessage: "This will permanently cancel the invoice. This action cannot be undone.",
          requiresInput: "reason",
        });
        break;

      case "ISSUED":
        // ISSUED → SENT
        {
          transitions.push({
            to: "SENT",
            label: "Send to Customer",
            enabled: true,
            dangerous: false,
          });
        }

        // ISSUED → CANCELED (only if no payments)
        {
          const hasPayments = payments.length > 0;
          transitions.push({
            to: "CANCELED",
            label: "Cancel Invoice",
            enabled: !hasPayments,
            reason: hasPayments ? "Cannot cancel invoice with recorded payments" : undefined,
            dangerous: true,
            confirmTitle: `Cancel Invoice ${this.invoice.number}?`,
            confirmMessage:
              "This will void the invoice. No further payments can be recorded. This action cannot be undone.",
            requiresInput: "reason",
          });
        }
        break;

      case "SENT":
        // SENT → CANCELED (only if no payments)
        {
          const hasPayments = payments.length > 0;
          transitions.push({
            to: "CANCELED",
            label: "Cancel Invoice",
            enabled: !hasPayments,
            reason: hasPayments ? "Cannot cancel invoice with recorded payments" : undefined,
            dangerous: true,
            confirmTitle: `Cancel Invoice ${this.invoice.number}?`,
            confirmMessage:
              "This will void the invoice. No further payments can be recorded. This action cannot be undone.",
            requiresInput: "reason",
          });
        }
        break;

      case "PAID":
        // Terminal state - no transitions
        break;

      case "CANCELED":
        // Terminal state - no transitions
        break;
    }

    return transitions;
  }

  private buildEditability(): InvoiceEditability {
    const { status } = this.invoice;

    switch (status) {
      case "DRAFT":
        return {
          canEditHeader: true,
          canEditDates: true,
          canEditLineItems: true,
        };

      case "ISSUED":
      case "SENT":
        return {
          canEditHeader: false,
          canEditDates: false,
          canEditLineItems: false,
          reason: "Invoice has been issued. No edits allowed.",
        };

      case "PAID":
        return {
          canEditHeader: false,
          canEditDates: false,
          canEditLineItems: false,
          reason: "Invoice has been paid. No edits allowed.",
        };

      case "CANCELED":
        return {
          canEditHeader: false,
          canEditDates: false,
          canEditLineItems: false,
          reason: "Invoice has been canceled. No edits allowed.",
        };

      default:
        return {
          canEditHeader: false,
          canEditDates: false,
          canEditLineItems: false,
        };
    }
  }

  private buildAuditInfo(): InvoiceAuditInfo {
    return {
      trackChanges: true,
      lastModifiedAt: this.invoice.updatedAt.toISOString(),
      // lastModifiedBy would require user context - omitted for now
    };
  }
}

/**
 * Factory function for building capabilities
 */
export function buildInvoiceCapabilities(
  invoice: InvoiceAggregate,
  now: Date = new Date()
): InvoiceCapabilities {
  return new InvoiceCapabilitiesBuilder(invoice, now).build();
}
