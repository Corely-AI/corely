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
  ConflictError,
  ok,
  err,
} from "@corely/kernel";
import {
  type CreateLoyaltyEarnEntryInput,
  type CreateLoyaltyEarnEntryOutput,
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

export class CreateLoyaltyEarnEntryUseCase extends BaseUseCase<
  CreateLoyaltyEarnEntryInput,
  CreateLoyaltyEarnEntryOutput
> {
  constructor(protected readonly deps: Deps) {
    super({ logger: deps.logger, idempotency: deps.idempotency });
  }

  protected getIdempotencyKey(
    input: CreateLoyaltyEarnEntryInput,
    ctx: UseCaseContext
  ): string | undefined {
    if (!input.idempotencyKey || !ctx.tenantId) {
      return undefined;
    }
    return `engagement:loyalty:earn:${ctx.tenantId}:${input.idempotencyKey}`;
  }

  protected async handle(
    input: CreateLoyaltyEarnEntryInput,
    ctx: UseCaseContext
  ): Promise<Result<CreateLoyaltyEarnEntryOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId is required"));
    }
    if (!input.idempotencyKey) {
      return err(new ValidationError("idempotencyKey is required"));
    }

    if (input.sourceType && input.sourceId) {
      const existing = await this.deps.loyalty.findLedgerEntryBySource(
        ctx.tenantId,
        input.sourceType,
        input.sourceId,
        input.reasonCode
      );
      if (existing) {
        return err(
          new ConflictError(
            "Loyalty entry already exists for source",
            { entryId: existing.entryId },
            "LOYALTY_DUPLICATE"
          )
        );
      }
    }

    const now = new Date();
    await this.deps.loyalty.createLedgerEntry({
      entryId: input.entryId,
      tenantId: ctx.tenantId,
      customerPartyId: input.customerPartyId,
      entryType: "EARN",
      pointsDelta: input.pointsDelta,
      reasonCode: input.reasonCode,
      sourceType: input.sourceType ?? null,
      sourceId: input.sourceId ?? null,
      createdAt: now,
      createdByEmployeePartyId: input.createdByEmployeePartyId ?? null,
    });

    const account =
      (await this.deps.loyalty.getAccountByCustomer(ctx.tenantId, input.customerPartyId)) ??
      (await this.deps.loyalty.upsertAccount(ctx.tenantId, input.customerPartyId, "ACTIVE"));
    await this.deps.loyalty.updateAccountBalance(
      ctx.tenantId,
      input.customerPartyId,
      account.currentPointsBalance + input.pointsDelta,
      {
        lifetimeEarnedPoints: account.lifetimeEarnedPoints + input.pointsDelta,
      }
    );

    const refreshed =
      (await this.deps.loyalty.getAccountByCustomer(ctx.tenantId, input.customerPartyId)) ??
      account;

    await this.deps.audit.log({
      tenantId: ctx.tenantId,
      userId: ctx.userId ?? "system",
      action: "engagement.loyalty.earn",
      entityType: "LoyaltyAccount",
      entityId: refreshed.loyaltyAccountId,
      metadata: {
        entryId: input.entryId,
        pointsDelta: input.pointsDelta,
        customerPartyId: input.customerPartyId,
      },
    });

    await this.deps.outbox.enqueue({
      eventType: "LoyaltyPointsEarned",
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
        entryType: "EARN",
        pointsDelta: input.pointsDelta,
        reasonCode: input.reasonCode,
        sourceType: input.sourceType ?? null,
        sourceId: input.sourceId ?? null,
        createdAt: now,
        createdByEmployeePartyId: input.createdByEmployeePartyId ?? null,
      }),
    });
  }
}
