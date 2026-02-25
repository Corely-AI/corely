import type { CashlessProviderKind } from "@corely/contracts";
import type { PaymentAttempt } from "../../domain/payment-attempt.entity";

export interface PaymentAttemptRepositoryPort {
  create(attempt: PaymentAttempt): Promise<void>;
  update(attempt: PaymentAttempt): Promise<void>;
  findById(workspaceId: string, attemptId: string): Promise<PaymentAttempt | null>;
  findByIdempotencyKey(workspaceId: string, idempotencyKey: string): Promise<PaymentAttempt | null>;
  findByProviderRef(
    workspaceId: string,
    providerKind: CashlessProviderKind,
    providerRef: string
  ): Promise<PaymentAttempt | null>;
}

export const PAYMENT_ATTEMPT_REPOSITORY_PORT = "pos/payment-attempt-repository";
