import type {
  CashlessAction,
  CashlessAttemptStatus,
  CashlessProviderKind,
  GetCashlessPaymentStatusOutput,
  StartCashlessPaymentOutput,
} from "@corely/contracts";

const allowedTransitions: Record<CashlessAttemptStatus, CashlessAttemptStatus[]> = {
  pending: ["authorized", "paid", "failed", "cancelled", "expired"],
  authorized: ["paid", "failed", "cancelled", "expired"],
  paid: [],
  failed: [],
  cancelled: [],
  expired: [],
};

export interface PaymentAttemptProps {
  id: string;
  tenantId: string;
  workspaceId: string;
  saleId?: string | null;
  registerId: string;
  amountCents: number;
  currency: string;
  status: CashlessAttemptStatus;
  providerKind: CashlessProviderKind;
  providerRef: string;
  action: CashlessAction;
  idempotencyKey: string;
  failureReason?: string | null;
  paidAt?: Date | null;
  expiresAt?: Date | null;
  rawStatus?: unknown;
  createdAt: Date;
  updatedAt: Date;
}

export class PaymentAttempt {
  constructor(private props: PaymentAttemptProps) {}

  static create(props: Omit<PaymentAttemptProps, "createdAt" | "updatedAt">): PaymentAttempt {
    const now = new Date();
    return new PaymentAttempt({
      ...props,
      createdAt: now,
      updatedAt: now,
    });
  }

  toObject(): PaymentAttemptProps {
    return { ...this.props };
  }

  markPaid(paidAt: Date, raw?: unknown): void {
    this.transition("paid", {
      paidAt,
      failureReason: null,
      rawStatus: raw,
    });
  }

  markFailed(reason?: string | null, raw?: unknown): void {
    this.transition("failed", {
      failureReason: reason ?? null,
      rawStatus: raw,
    });
  }

  markCancelled(raw?: unknown): void {
    this.transition("cancelled", {
      rawStatus: raw,
    });
  }

  markExpired(raw?: unknown): void {
    this.transition("expired", {
      rawStatus: raw,
    });
  }

  applyProviderStatus(
    status: CashlessAttemptStatus,
    data: { action: CashlessAction; raw?: unknown }
  ): void {
    if (status === "paid") {
      this.markPaid(new Date(), data.raw);
    } else if (status === "failed") {
      this.markFailed(null, data.raw);
    } else if (status === "cancelled") {
      this.markCancelled(data.raw);
    } else if (status === "expired") {
      this.markExpired(data.raw);
    } else {
      this.transition(status, {
        action: data.action,
        rawStatus: data.raw,
      });
    }
  }

  toStartOutput(): StartCashlessPaymentOutput {
    return {
      attemptId: this.props.id,
      providerKind: this.props.providerKind,
      providerRef: this.props.providerRef,
      status: this.props.status,
      action: this.props.action,
      expiresAt: this.props.expiresAt?.toISOString() ?? null,
    };
  }

  toStatusOutput(): GetCashlessPaymentStatusOutput {
    return {
      attemptId: this.props.id,
      providerKind: this.props.providerKind,
      providerRef: this.props.providerRef,
      status: this.props.status,
      action: this.props.action,
      paidAt: this.props.paidAt?.toISOString() ?? null,
      failureReason: this.props.failureReason ?? null,
      updatedAt: this.props.updatedAt.toISOString(),
    };
  }

  private transition(next: CashlessAttemptStatus, patch: Partial<PaymentAttemptProps>): void {
    const current = this.props.status;
    if (current === next) {
      this.props = {
        ...this.props,
        ...patch,
        updatedAt: new Date(),
      };
      return;
    }

    const allowed = allowedTransitions[current];
    if (!allowed.includes(next)) {
      throw new Error(`Invalid payment attempt transition: ${current} -> ${next}`);
    }

    this.props = {
      ...this.props,
      ...patch,
      status: next,
      updatedAt: new Date(),
    };
  }
}
