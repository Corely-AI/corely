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
import type { SubmitDailyClose } from "@corely/contracts";
import { CashEntryType, CashEntrySourceType, DailyCloseStatus } from "@corely/contracts";
import { type CashRepositoryPort, CASH_REPOSITORY } from "../ports/cash-repository.port";
import { CashDayCloseEntity } from "../../domain/entities";
import { Inject, Injectable } from "@nestjs/common";
import { AddEntryUseCase } from "./add-entry.usecase";

@RequireTenant()
@Injectable()
export class SubmitDailyCloseUseCase extends BaseUseCase<SubmitDailyClose, CashDayCloseEntity> {
  constructor(
    @Inject(CASH_REPOSITORY) private readonly repository: CashRepositoryPort,
    private readonly addEntryUC: AddEntryUseCase
  ) {
    super({ logger: null as any });
  }

  protected async handle(
    input: SubmitDailyClose,
    ctx: UseCaseContext
  ): Promise<Result<CashDayCloseEntity, UseCaseError>> {
    const tenantId = ctx.tenantId!;
    const { registerId, businessDate, countedBalanceCents, notes } = input;

    // 1. Fetch Register
    const register = await this.repository.findById(tenantId, registerId);
    if (!register) {
      return err(new NotFoundError("Cash Register not found"));
    }

    // 2. Check Existing Close
    const existing = await this.repository.findDailyClose(tenantId, registerId, businessDate);
    if (existing && existing.status === DailyCloseStatus.LOCKED) {
      return err(new ValidationError("Daily close is locked"));
    }

    const expectedBalanceCents = register.currentBalanceCents;
    const differenceCents = countedBalanceCents - expectedBalanceCents;

    // 3. Handle Difference (Auto-Entry via UseCase to ensure Event Emission)
    if (differenceCents !== 0) {
      const type = differenceCents > 0 ? CashEntryType.IN : CashEntryType.OUT;
      const amount = Math.abs(differenceCents);

      const addEntryResult = await this.addEntryUC.execute(
        {
          tenantId,
          registerId,
          type,
          amountCents: amount,
          sourceType: CashEntrySourceType.DIFFERENCE,
          description: `Daily Close Difference ${businessDate}`,
          businessDate,
        },
        ctx
      );

      if (!addEntryResult.ok) {
        return err((addEntryResult as any).error);
      }
    }

    // 4. Create/Update Close
    const closeEntity = new CashDayCloseEntity(
      existing?.id ?? "",
      tenantId,
      ctx.workspaceId || tenantId,
      registerId,
      businessDate,
      DailyCloseStatus.SUBMITTED,
      expectedBalanceCents,
      countedBalanceCents,
      differenceCents,
      notes ?? null,
      new Date(),
      ctx.userId || "system",
      new Date(),
      new Date()
    );

    const saved = await this.repository.saveDailyClose(closeEntity);
    return ok(saved);
  }
}
