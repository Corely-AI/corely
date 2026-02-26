import type { CashlessProviderKind } from "@corely/contracts";

export interface CashlessPaymentUpdatePort {
  markPaid(input: {
    workspaceId: string;
    providerKind: CashlessProviderKind;
    providerRef: string;
    paidAt: Date;
    raw?: unknown;
  }): Promise<void>;

  markFailed(input: {
    workspaceId: string;
    providerKind: CashlessProviderKind;
    providerRef: string;
    reason?: string | null;
    raw?: unknown;
  }): Promise<void>;

  markCancelled(input: {
    workspaceId: string;
    providerKind: CashlessProviderKind;
    providerRef: string;
    raw?: unknown;
  }): Promise<void>;

  markExpired(input: {
    workspaceId: string;
    providerKind: CashlessProviderKind;
    providerRef: string;
    raw?: unknown;
  }): Promise<void>;
}

export const CASHLESS_PAYMENT_UPDATE_PORT = Symbol("pos/cashless-payment-update");
