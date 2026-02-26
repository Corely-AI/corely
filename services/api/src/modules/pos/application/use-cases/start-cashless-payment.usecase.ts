import { randomUUID } from "node:crypto";
import { Inject, Injectable } from "@nestjs/common";
import {
  BaseUseCase,
  RequireTenant,
  ValidationError,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  NoopLogger,
  ok,
  err,
  ConflictError,
} from "@corely/kernel";
import type { StartCashlessPaymentInput, StartCashlessPaymentOutput } from "@corely/contracts";
import { CASHLESS_GATEWAY_PORT, type CashlessGatewayPort } from "../ports/cashless-gateway.port";
import {
  PAYMENT_ATTEMPT_REPOSITORY_PORT,
  type PaymentAttemptRepositoryPort,
} from "../ports/payment-attempt-repository.port";
import { PaymentAttempt } from "../../domain/payment-attempt.entity";

@RequireTenant()
@Injectable()
export class StartCashlessPaymentUseCase extends BaseUseCase<
  StartCashlessPaymentInput,
  StartCashlessPaymentOutput
> {
  constructor(
    @Inject(CASHLESS_GATEWAY_PORT) private readonly gateway: CashlessGatewayPort,
    @Inject(PAYMENT_ATTEMPT_REPOSITORY_PORT)
    private readonly attempts: PaymentAttemptRepositoryPort
  ) {
    super({ logger: new NoopLogger() });
  }

  protected validate(input: StartCashlessPaymentInput): StartCashlessPaymentInput {
    if (input.amountCents <= 0) {
      throw new ValidationError("amountCents must be greater than zero");
    }
    return input;
  }

  protected async handle(
    input: StartCashlessPaymentInput,
    ctx: UseCaseContext
  ): Promise<Result<StartCashlessPaymentOutput, UseCaseError>> {
    const workspaceId = ctx.workspaceId ?? ctx.tenantId;
    const tenantId = ctx.tenantId;

    if (!workspaceId || !tenantId) {
      return err(new ValidationError("workspaceId and tenantId are required"));
    }

    const idempotencyKey = input.idempotencyKey ?? `cashless:${randomUUID()}`;
    const existing = await this.attempts.findByIdempotencyKey(workspaceId, idempotencyKey);
    if (existing) {
      return ok(existing.toStartOutput());
    }

    const reference =
      input.reference ??
      `${workspaceId}:${input.registerId}:${input.saleId ?? "nosale"}:${input.amountCents}`;

    const session = await this.gateway.createSession({
      workspaceId,
      amountCents: input.amountCents,
      currency: input.currency,
      reference,
      providerHint: input.providerHint,
    });

    const attempt = PaymentAttempt.create({
      id: randomUUID(),
      tenantId,
      workspaceId,
      saleId: input.saleId ?? null,
      registerId: input.registerId,
      amountCents: input.amountCents,
      currency: input.currency,
      status: session.status,
      providerKind: session.providerKind,
      providerRef: session.providerRef,
      action: session.action,
      idempotencyKey,
      failureReason: null,
      paidAt: null,
      expiresAt: session.expiresAt ?? null,
      rawStatus: session.raw,
    });

    try {
      await this.attempts.create(attempt);
    } catch (error) {
      return err(
        new ConflictError("Payment attempt already exists", error, "PAYMENT_ATTEMPT_CONFLICT")
      );
    }

    return ok(attempt.toStartOutput());
  }
}
