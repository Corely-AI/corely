import { Inject, Injectable } from "@nestjs/common";
import type { CashlessProviderKind } from "@corely/contracts";
import { NotFoundError, ValidationError } from "@corely/kernel";
import {
  PAYMENT_ATTEMPT_REPOSITORY_PORT,
  type PaymentAttemptRepositoryPort,
} from "../ports/payment-attempt-repository.port";
import type { CashlessPaymentUpdatePort } from "../ports/cashless-payment-update.port";

@Injectable()
export class CashlessPaymentUpdaterService implements CashlessPaymentUpdatePort {
  constructor(
    @Inject(PAYMENT_ATTEMPT_REPOSITORY_PORT)
    private readonly attempts: PaymentAttemptRepositoryPort
  ) {}

  async markPaid(input: {
    workspaceId: string;
    providerKind: CashlessProviderKind;
    providerRef: string;
    paidAt: Date;
    raw?: unknown;
  }): Promise<void> {
    const attempt = await this.findAttempt(
      input.workspaceId,
      input.providerKind,
      input.providerRef
    );
    attempt.markPaid(input.paidAt, input.raw);
    await this.attempts.update(attempt);
  }

  async markFailed(input: {
    workspaceId: string;
    providerKind: CashlessProviderKind;
    providerRef: string;
    reason?: string | null;
    raw?: unknown;
  }): Promise<void> {
    const attempt = await this.findAttempt(
      input.workspaceId,
      input.providerKind,
      input.providerRef
    );
    attempt.markFailed(input.reason, input.raw);
    await this.attempts.update(attempt);
  }

  async markCancelled(input: {
    workspaceId: string;
    providerKind: CashlessProviderKind;
    providerRef: string;
    raw?: unknown;
  }): Promise<void> {
    const attempt = await this.findAttempt(
      input.workspaceId,
      input.providerKind,
      input.providerRef
    );
    attempt.markCancelled(input.raw);
    await this.attempts.update(attempt);
  }

  async markExpired(input: {
    workspaceId: string;
    providerKind: CashlessProviderKind;
    providerRef: string;
    raw?: unknown;
  }): Promise<void> {
    const attempt = await this.findAttempt(
      input.workspaceId,
      input.providerKind,
      input.providerRef
    );
    attempt.markExpired(input.raw);
    await this.attempts.update(attempt);
  }

  private async findAttempt(
    workspaceId: string,
    providerKind: CashlessProviderKind,
    providerRef: string
  ) {
    if (!workspaceId) {
      throw new ValidationError("workspaceId is required");
    }

    const attempt = await this.attempts.findByProviderRef(workspaceId, providerKind, providerRef);
    if (!attempt) {
      throw new NotFoundError(`Payment attempt ${providerKind}:${providerRef} not found`);
    }

    return attempt;
  }
}
