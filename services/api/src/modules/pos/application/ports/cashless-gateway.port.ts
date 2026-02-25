import type {
  CashlessAction,
  CashlessAttemptStatus,
  CashlessProviderKind,
} from "@corely/contracts";

export interface CreateCashlessSessionInput {
  workspaceId: string;
  amountCents: number;
  currency: string;
  reference: string;
  providerHint?: CashlessProviderKind;
}

export interface CreateCashlessSessionOutput {
  providerKind: CashlessProviderKind;
  providerRef: string;
  status: CashlessAttemptStatus;
  action: CashlessAction;
  raw?: unknown;
  expiresAt?: Date | null;
}

export interface GetCashlessSessionStatusInput {
  workspaceId: string;
  providerKind: CashlessProviderKind;
  providerRef: string;
}

export interface GetCashlessSessionStatusOutput {
  status: CashlessAttemptStatus;
  action: CashlessAction;
  raw?: unknown;
  paidAt?: Date | null;
  failureReason?: string | null;
}

export interface CashlessGatewayPort {
  createSession(input: CreateCashlessSessionInput): Promise<CreateCashlessSessionOutput>;
  getStatus(input: GetCashlessSessionStatusInput): Promise<GetCashlessSessionStatusOutput>;
  cancelSession?(input: GetCashlessSessionStatusInput): Promise<GetCashlessSessionStatusOutput>;
}

export const CASHLESS_GATEWAY_PORT = "pos/cashless-gateway";
