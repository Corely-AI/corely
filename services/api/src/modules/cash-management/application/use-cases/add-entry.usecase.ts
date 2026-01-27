import {
  BaseUseCase,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ValidationError,
  NotFoundError,
  err,
  ok,
  RequireTenant,
} from "@corely/kernel";
import type { CreateCashEntry } from "@corely/contracts";
import { CashEntryType, DailyCloseStatus } from "@corely/contracts";
import { type CashRepositoryPort, CASH_REPOSITORY } from "../ports/cash-repository.port";
import type { CashEntryEntity } from "../../domain/entities";
import { Inject, Injectable } from "@nestjs/common";
import { OUTBOX_PORT, type OutboxPort } from "@corely/kernel";

@RequireTenant()
@Injectable()
export class AddEntryUseCase extends BaseUseCase<CreateCashEntry, CashEntryEntity> {
  constructor(
    @Inject(CASH_REPOSITORY) private readonly repository: CashRepositoryPort,
    @Inject(OUTBOX_PORT) private readonly outbox: OutboxPort
  ) {
    super({ logger: null as any }); // TODO: Proper logger
  }

  protected async handle(
    input: CreateCashEntry,
    ctx: UseCaseContext
  ): Promise<Result<CashEntryEntity, UseCaseError>> {
    const tenantId = ctx.tenantId!;
    const { registerId, amountCents, type, businessDate } = input;

    // 1. Fetch Register
    const register = await this.repository.findById(tenantId, registerId);
    if (!register) {
      return err(new NotFoundError("Cash Register not found"));
    }

    // 2. Validation: Negative Balance
    if (type === CashEntryType.OUT) {
      if (register.currentBalanceCents < amountCents) {
        return err(new ValidationError("Insufficient funds in register"));
      }
    }

    // 3. Validation: Locked Period
    if (businessDate) {
      const close = await this.repository.findDailyClose(tenantId, registerId, businessDate);
      if (close && close.status === DailyCloseStatus.LOCKED) {
        return err(new ValidationError(`Date ${businessDate} is locked`));
      }
    }

    // 4. Create Entry
    const entry = await this.repository.createEntry({
      ...input,
      tenantId,
      workspaceId: ctx.workspaceId || tenantId,
      createdByUserId: ctx.userId || "system",
    });

    // 5. Emit Event
    await this.outbox.enqueue({
      tenantId,
      eventType: "cash.entry.created",
      payload: {
        entryId: entry.id,
        registerId: entry.registerId,
        amountCents: entry.amountCents,
        type: entry.type,
        sourceType: entry.sourceType,
        businessDate: entry.businessDate,
      },
    });

    return ok(entry);
  }
}
