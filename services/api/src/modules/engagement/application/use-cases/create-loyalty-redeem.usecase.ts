import {
  type AuditPort,
  BaseUseCase,
  ConflictError,
  type IdempotencyPort,
  type LoggerPort,
  type OutboxPort,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ValidationError,
  ok,
  err,
} from "@corely/kernel";
import {
  type CreateLoyaltyRedeemEntryInput,
  type CreateLoyaltyRedeemEntryOutput,
} from "@corely/contracts";
import { toLoyaltyAccountDto, toLoyaltyLedgerEntryDto } from "../mappers/engagement-dto.mappers";
import type { LoyaltyRepositoryPort } from "../ports/loyalty-repository.port";

type Deps = {
  logger: LoggerPort;
  loyalty: LoyaltyRepositoryPort;
  idempotency: IdempotencyPort;
  audit: AuditPort;
  outbox: OutboxPort;
};

export class CreateLoyaltyRedeemEntryUseCase extends BaseUseCase<
  CreateLoyaltyRedeemEntryInput,
  CreateLoyaltyRedeemEntryOutput
> {
  constructor(protected readonly deps: Deps) {
    super({ logger: deps.logger, idempotency: deps.idempotency });
  }

  protected getIdempotencyKey(
    input: CreateLoyaltyRedeemEntryInput,
    ctx: UseCaseContext
  ): string | undefined {
    if (!input.idempotencyKey || !ctx.tenantId) {
      return undefined;
    }
    return `engagement:loyalty:redeem:${ctx.tenantId}:${input.idempotencyKey}`;
  }

  protected async handle(
    input: CreateLoyaltyRedeemEntryInput,
    ctx: UseCaseContext
  ): Promise<Result<CreateLoyaltyRedeemEntryOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId is required"));
    }
    if (!input.idempotencyKey) {
      return err(new ValidationError("idempotencyKey is required"));
    }

    const account =
      (await this.deps.loyalty.getAccountByCustomer(ctx.tenantId, input.customerPartyId)) ??
      (await this.deps.loyalty.upsertAccount(ctx.tenantId, input.customerPartyId, "ACTIVE"));

    if (account.currentPointsBalance < input.pointsDelta) {
      return err(
        new ConflictError(
          "Insufficient loyalty points",
          {
            balance: account.currentPointsBalance,
            requested: input.pointsDelta,
          },
          "LOYALTY_INSUFFICIENT_BALANCE"
        )
      );
    }

    const now = new Date();
    const pointsDelta = -Math.abs(input.pointsDelta);
    await this.deps.loyalty.createLedgerEntry({
      entryId: input.entryId,
      tenantId: ctx.tenantId,
      customerPartyId: input.customerPartyId,
      entryType: "REDEEM",
      pointsDelta,
      reasonCode: "REWARD_REDEMPTION",
      sourceType: input.sourceType ?? "REDEEM",
      sourceId: input.sourceId ?? input.entryId,
      createdAt: now,
      createdByEmployeePartyId: input.createdByEmployeePartyId ?? null,
    });

    const nextBalance = account.currentPointsBalance + pointsDelta;
    await this.deps.loyalty.updateAccountBalance(ctx.tenantId, input.customerPartyId, nextBalance, {
      lifetimeEarnedPoints: account.lifetimeEarnedPoints,
    });

    const refreshed =
      (await this.deps.loyalty.getAccountByCustomer(ctx.tenantId, input.customerPartyId)) ??
      account;

    await this.deps.audit.log({
      tenantId: ctx.tenantId,
      userId: ctx.userId ?? "system",
      action: "engagement.loyalty.redeem",
      entityType: "LoyaltyAccount",
      entityId: refreshed.loyaltyAccountId,
      metadata: {
        entryId: input.entryId,
        customerPartyId: input.customerPartyId,
        pointsRedeemed: input.pointsDelta,
        balanceAfter: refreshed.currentPointsBalance,
      },
    });

    await this.deps.outbox.enqueue({
      eventType: "LoyaltyPointsRedeemed",
      tenantId: ctx.tenantId,
      correlationId: ctx.correlationId,
      payload: {
        entryId: input.entryId,
        customerPartyId: input.customerPartyId,
        pointsRedeemed: input.pointsDelta,
        balanceAfter: refreshed.currentPointsBalance,
      },
    });

    return ok({
      entry: toLoyaltyLedgerEntryDto({
        entryId: input.entryId,
        tenantId: ctx.tenantId,
        customerPartyId: input.customerPartyId,
        entryType: "REDEEM",
        pointsDelta,
        reasonCode: "REWARD_REDEMPTION",
        sourceType: input.sourceType ?? "REDEEM",
        sourceId: input.sourceId ?? input.entryId,
        createdAt: now,
        createdByEmployeePartyId: input.createdByEmployeePartyId ?? null,
      }),
      account: toLoyaltyAccountDto(refreshed),
    });
  }
}
