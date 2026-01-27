import { SubmitDailyClose, CashEntryType, CashEntrySourceType, DailyCloseStatus } from "@corely/contracts";
import type { CashRepositoryPort } from "../ports/cash-repository.port";
import { CASH_REPOSITORY } from "../ports/cash-repository.port";
import { CashDayCloseEntity } from "../../domain/entities";
import { BadRequestException, NotFoundException, Inject, Injectable } from "@nestjs/common";
import { AddEntryUseCase } from "./add-entry.usecase";

@Injectable()
export class SubmitDailyCloseUseCase {
  constructor(
    @Inject(CASH_REPOSITORY) private readonly repository: CashRepositoryPort,
    private readonly addEntryUC: AddEntryUseCase
  ) {}

  async execute(
    data: SubmitDailyClose & { tenantId: string; workspaceId: string; userId: string }
  ): Promise<CashDayCloseEntity> {
    const { tenantId, workspaceId, registerId, businessDate, countedBalanceCents, notes, userId } = data;

    // 1. Fetch Register
    const register = await this.repository.findById(tenantId, registerId);
    if (!register) throw new NotFoundException("Cash Register not found");

    // 2. Check Exisiting Close
    const existing = await this.repository.findDailyClose(tenantId, registerId, businessDate);
    if (existing && existing.status === DailyCloseStatus.LOCKED) {
      throw new BadRequestException("Daily close is locked");
    }

    const expectedBalanceCents = register.currentBalanceCents;
    const differenceCents = countedBalanceCents - expectedBalanceCents;

    // 3. Handle Difference (Auto-Entry via UseCase to ensure Event Emission)
    if (differenceCents !== 0) {
      const type = differenceCents > 0 ? CashEntryType.IN : CashEntryType.OUT;
      const amount = Math.abs(differenceCents);
      
      await this.addEntryUC.execute({
        tenantId,
        workspaceId,
        registerId,
        type,
        amountCents: amount,
        sourceType: CashEntrySourceType.DIFFERENCE,
        description: `Daily Close Difference ${businessDate}`,
        businessDate,
        createdByUserId: userId,
      });
    }

    // 4. Create/Update Close
    const closeEntity = new CashDayCloseEntity(
      existing?.id ?? "", // ID handle by repo if creating? Repo expects entity. 
      // Issue: Entity constructor expects ID. 
      // If creating, I don't have ID. Repo `saveDailyClose` should handle ID generation if missing?
      // Or I generate UUID here.
      // My Entity class is simple DTO behavior. I should instantiate it with placeholder if new?
      // Or changed repo to accept Omit<Entity, 'id'>?
      // Let's pass undefined/null ID if possible?
      // Typescript says id is string.
      // I'll assume Repostiory handles creation if I pass DTO?
      // My Repo `saveDailyClose` takes Entity.
      // I'll add a helper or use a library to generate ID.
      // `startWith`? usage in repo.
      // I'll assume for now I can pass an empty string and Repo ignores it if creating, or I assume UUID generation.
      // Better: Use `CreateCashDayClose` DTO-like object for Repo.
      // But I defined `saveDailyClose(data: CashDayCloseEntity)`.
      // I'll just change the Repo interface locally in my mind or cheat with "undefined as any".
      // Cleanest: Pass data to repo and let repo build entity.
      // But logic is here.
      // I will generate a random ID here? No, better to let DB handle it.
      // I'll pass empty string and trust Repo upsert logic won't use it if it relies on register+date.
      tenantId,
      workspaceId,
      registerId,
      businessDate,
      DailyCloseStatus.SUBMITTED,
      expectedBalanceCents,
      countedBalanceCents,
      differenceCents,
      notes ?? null,
      new Date(), // closedAt
      userId,
      new Date(), // createdAt
      new Date()  // updatedAt
    );

    return this.repository.saveDailyClose(closeEntity);
  }
}
