import {
  type ExpenseAction,
  type ExpenseBadge,
  type ExpenseCapabilities,
  type ExpenseDto,
  type ExpenseStatusCapability,
  type ExpenseTransition,
} from "@corely/contracts";

export class ExpenseCapabilitiesBuilder {
  private readonly expense: ExpenseDto;

  constructor(expense: ExpenseDto) {
    this.expense = expense;
  }

  public build(): ExpenseCapabilities {
    return {
      status: this.buildStatusCapability(),
      badges: this.buildBadges(),
      transitions: this.buildTransitions(),
      actions: this.buildActions(),
      editability: {
        canEdit: this.canEdit(),
        reason: this.canEdit() ? undefined : "Cannot edit in current status",
      },
      audit: {
        trackChanges: true,
        lastModifiedAt: this.expense.updatedAt,
      },
    };
  }

  private buildStatusCapability(): ExpenseStatusCapability {
    const status = this.expense.status;
    switch (status) {
      case "DRAFT":
        return { value: status, label: "Draft", tone: "muted" };
      case "SUBMITTED":
        return { value: status, label: "Submitted", tone: "default" };
      case "APPROVED":
        return { value: status, label: "Approved", tone: "accent" };
      case "PAID":
        return { value: status, label: "Paid", tone: "success" };
      case "REJECTED":
        return { value: status, label: "Rejected", tone: "destructive" };
    }
  }

  private buildBadges(): ExpenseBadge[] {
    const badges: ExpenseBadge[] = [];

    // Example badge: High Value > 1000 EUR
    if (this.expense.totalAmountCents > 100000) {
      badges.push({
        key: "HIGH_VALUE",
        label: "High Value",
        tone: "info",
      });
    }

    return badges;
  }

  private buildTransitions(): ExpenseTransition[] {
    const transitions: ExpenseTransition[] = [];
    const s = this.expense.status;

    if (s === "DRAFT") {
      transitions.push({
        to: "SUBMITTED",
        label: "Submit",
        enabled: true,
        dangerous: false,
      });
    }

    if (s === "SUBMITTED") {
      transitions.push({
        to: "APPROVED",
        label: "Approve",
        enabled: true,
        dangerous: false,
      });
      transitions.push({
        to: "REJECTED",
        label: "Reject",
        enabled: true,
        dangerous: true,
        confirmTitle: "Reject Expense",
        confirmMessage: "Are you sure you want to reject this expense?",
        requiresInput: "reason",
      });
    }

    if (s === "APPROVED") {
      transitions.push({
        to: "PAID",
        label: "Mark Paid",
        enabled: true,
        dangerous: false,
      });
    }

    return transitions;
  }

  private buildActions(): ExpenseAction[] {
    const actions: ExpenseAction[] = [];
    const s = this.expense.status;
    const canEdit = this.canEdit();

    // 1. Edit Action
    if (canEdit) {
      actions.push({
        key: "edit",
        label: "Edit",
        placement: "secondary",
        enabled: true,
        dangerous: false,
        href: `/expenses/${this.expense.id}/edit`, // Frontend navigation
      });
    }

    // 2. Delete Action
    // Allow delete in Draft, Submitted, Rejected. Not Paid/Approved ideally?
    // Matching existing flexible logic for now: allow delete unless Paid?
    if (s !== "PAID") {
      actions.push({
        key: "delete",
        label: "Delete",
        placement: "danger",
        enabled: true,
        dangerous: true,
        confirmTitle: "Delete Expense",
        confirmMessage: "This will permanently delete the expense record.",
      });
    }

    return actions;
  }

  private canEdit(): boolean {
    // Typically lock after approval
    return ["DRAFT", "SUBMITTED", "REJECTED"].includes(this.expense.status);
  }
}
