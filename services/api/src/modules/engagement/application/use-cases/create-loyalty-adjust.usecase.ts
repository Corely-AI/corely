import {
  type AuditPort,
  BaseUseCase,
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
  type CreateLoyaltyAdjustEntryInput,
  type CreateLoyaltyAdjustEntryOutput,
} from "@corely/contracts";
import { toLoyaltyLedgerEntryDto } from "../mappers/engagement-dto.mappers";
import type { LoyaltyRepositoryPort } from "../ports/loyalty-repository.port";

type Deps = {
  logger: LoggerPort;
  loyalty: LoyaltyRepositoryPort;
  idempotency: IdempotencyPort;
  audit: AuditPort;
  outbox: OutboxPort;
};

export class CreateLoyaltyAdjustEntryUseCase extends BaseUseCase<
  CreateLoyaltyAdjustEntryInput,
  CreateLoyaltyAdjustEntryOutput
> {
  constructor(protected readonly deps: Deps) {
    super({ logger: deps.logger, idempotency: deps.idempotency });
  }

  protected getIdempotencyKey(
    input: CreateLoyaltyAdjustEntryInput,
    ctx: UseCaseContext
  ): string | undefined {
    if (!input.idempotencyKey || !ctx.tenantId) {
      return undefined;
    }
    return `engagement:loyalty:adjust:${ctx.tenantId}:${input.idempotencyKey}`;
  }

  protected async handle(
    input: CreateLoyaltyAdjustEntryInput,
    ctx: UseCaseContext
  ): Promise<Result<CreateLoyaltyAdjustEntryOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId is required"));
    }
    if (!input.idempotencyKey) {
      return err(new ValidationError("idempotencyKey is required"));
    }

    const now = new Date();
    await this.deps.loyalty.createLedgerEntry({
      entryId: input.entryId,
      tenantId: ctx.tenantId,
      customerPartyId: input.customerPartyId,
      entryType: "ADJUST",
      pointsDelta: input.pointsDelta,
      reasonCode: "MANUAL_ADJUSTMENT",
      sourceType: "MANUAL",
      sourceId: input.entryId,
      createdAt: now,
      createdByEmployeePartyId: input.createdByEmployeePartyId ?? null,
    });

    const account =
      (await this.deps.loyalty.getAccountByCustomer(ctx.tenantId, input.customerPartyId)) ??
      (await this.deps.loyalty.upsertAccount(ctx.tenantId, input.customerPartyId, "ACTIVE"));
    const lifetimeEarnedPoints =
      input.pointsDelta > 0
        ? account.lifetimeEarnedPoints + input.pointsDelta
        : account.lifetimeEarnedPoints;

    await this.deps.loyalty.updateAccountBalance(
      ctx.tenantId,
      input.customerPartyId,
      account.currentPointsBalance + input.pointsDelta,
      { lifetimeEarnedPoints }
    );

    const refreshed =
      (await this.deps.loyalty.getAccountByCustomer(ctx.tenantId, input.customerPartyId)) ??
      account;

    await this.deps.audit.log({
      tenantId: ctx.tenantId,
      userId: ctx.userId ?? "system",
      action: "engagement.loyalty.adjust",
      entityType: "LoyaltyAccount",
      entityId: refreshed.loyaltyAccountId,
      metadata: {
        entryId: input.entryId,
        pointsDelta: input.pointsDelta,
        customerPartyId: input.customerPartyId,
      },
    });

    await this.deps.outbox.enqueue({
      eventType: "LoyaltyPointsAdjusted",
      tenantId: ctx.tenantId,
      correlationId: ctx.correlationId,
      payload: {
        entryId: input.entryId,
        customerPartyId: input.customerPartyId,
        pointsDelta: input.pointsDelta,
        balanceAfter: refreshed.currentPointsBalance,
      },
    });

    return ok({
      entry: toLoyaltyLedgerEntryDto({
        entryId: input.entryId,
        tenantId: ctx.tenantId,
        customerPartyId: input.customerPartyId,
        entryType: "ADJUST",
        pointsDelta: input.pointsDelta,
        reasonCode: "MANUAL_ADJUSTMENT",
        sourceType: "MANUAL",
        sourceId: input.entryId,
        createdAt: now,
        createdByEmployeePartyId: input.createdByEmployeePartyId ?? null,
      }),
    });
  }
}
