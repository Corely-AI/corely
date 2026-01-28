import {
  BaseUseCase,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  NotFoundError,
  err,
  ok,
  RequireTenant,
} from "@corely/kernel";
import type { ReverseCashEntry } from "@corely/contracts";
import { CashEntryType, CashEntrySourceType } from "@corely/contracts";
import { type CashRepositoryPort, CASH_REPOSITORY } from "../ports/cash-repository.port";
import type { CashEntryEntity } from "../../domain/entities";
import { Inject, Injectable } from "@nestjs/common";

@RequireTenant()
@Injectable()
export class ReverseEntryUseCase extends BaseUseCase<ReverseCashEntry, CashEntryEntity> {
  constructor(@Inject(CASH_REPOSITORY) private readonly repository: CashRepositoryPort) {
    super({ logger: null as any });
  }

  protected async handle(
    input: ReverseCashEntry,
    ctx: UseCaseContext
  ): Promise<Result<CashEntryEntity, UseCaseError>> {
    const tenantId = ctx.tenantId!;
    const { originalEntryId, reason } = input;

    // 1. Fetch Original
    const original = await this.repository.findEntryById(tenantId, originalEntryId);
    if (!original) {
      return err(new NotFoundError("Original entry not found"));
    }

    // 2. Create Reversal
    const reversalType = original.type === CashEntryType.IN ? CashEntryType.OUT : CashEntryType.IN;

    const entry = await this.repository.createEntry({
      tenantId,
      workspaceId: original.workspaceId,
      registerId: original.registerId,
      type: reversalType,
      amountCents: original.amountCents,
      sourceType: CashEntrySourceType.MANUAL,
      description: `Reversal: ${original.description}. Reason: ${reason}`,
      referenceId: original.id,
      businessDate: original.businessDate ?? undefined,
      createdByUserId: ctx.userId || "system",
    });

    return ok(entry);
  }
}
