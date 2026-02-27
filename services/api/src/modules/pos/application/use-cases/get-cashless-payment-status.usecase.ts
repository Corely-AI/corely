import { Inject, Injectable } from "@nestjs/common";
import {
  BaseUseCase,
  NotFoundError,
  RequireTenant,
  ValidationError,
  NoopLogger,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  err,
  ok,
} from "@corely/kernel";
import type {
  GetCashlessPaymentStatusInput,
  GetCashlessPaymentStatusOutput,
} from "@corely/contracts";
import {
  PAYMENT_ATTEMPT_REPOSITORY_PORT,
  type PaymentAttemptRepositoryPort,
} from "../ports/payment-attempt-repository.port";
import { CASHLESS_GATEWAY_PORT, type CashlessGatewayPort } from "../ports/cashless-gateway.port";

const STALE_REFRESH_MS = 15_000;

@RequireTenant()
@Injectable()
export class GetCashlessPaymentStatusUseCase extends BaseUseCase<
  GetCashlessPaymentStatusInput,
  GetCashlessPaymentStatusOutput
> {
  constructor(
    @Inject(PAYMENT_ATTEMPT_REPOSITORY_PORT)
    private readonly attempts: PaymentAttemptRepositoryPort,
    @Inject(CASHLESS_GATEWAY_PORT) private readonly gateway: CashlessGatewayPort
  ) {
    super({ logger: new NoopLogger() });
  }

  protected async handle(
    input: GetCashlessPaymentStatusInput,
    ctx: UseCaseContext
  ): Promise<Result<GetCashlessPaymentStatusOutput, UseCaseError>> {
    const workspaceId = ctx.workspaceId ?? ctx.tenantId;

    if (!workspaceId) {
      return err(new ValidationError("workspaceId is required"));
    }

    const attempt = await this.attempts.findById(workspaceId, input.attemptId);
    if (!attempt) {
      return err(
        new NotFoundError(
          "Payment attempt not found",
          { attemptId: input.attemptId },
          "PAYMENT_ATTEMPT_NOT_FOUND"
        )
      );
    }

    const snapshot = attempt.toObject();
    const isOpenState = snapshot.status === "pending" || snapshot.status === "authorized";
    const shouldRefresh =
      isOpenState && Date.now() - snapshot.updatedAt.getTime() > STALE_REFRESH_MS;

    if (shouldRefresh) {
      const providerStatus = await this.gateway.getStatus({
        workspaceId,
        providerKind: snapshot.providerKind,
        providerRef: snapshot.providerRef,
      });

      attempt.applyProviderStatus(providerStatus.status, {
        action: providerStatus.action,
        raw: providerStatus.raw,
      });

      if (providerStatus.status === "paid" && providerStatus.paidAt) {
        attempt.markPaid(providerStatus.paidAt, providerStatus.raw);
      }
      if (providerStatus.status === "failed") {
        attempt.markFailed(providerStatus.failureReason ?? null, providerStatus.raw);
      }

      await this.attempts.update(attempt);
    }

    return ok(attempt.toStatusOutput());
  }
}
