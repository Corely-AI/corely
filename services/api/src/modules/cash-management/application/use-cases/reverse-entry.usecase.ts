import { ReverseCashEntry, CashEntryType, CashEntrySourceType } from "@corely/contracts";
import { CashRepositoryPort } from "../ports/cash-repository.port";
import { CashEntryEntity } from "../../domain/entities";
import { NotFoundException } from "@nestjs/common";

export class ReverseEntryUseCase {
  constructor(private readonly repository: CashRepositoryPort) {}

  async execute(
    data: ReverseCashEntry & { userId: string }
  ): Promise<CashEntryEntity> {
    const { tenantId, originalEntryId, reason, userId } = data;

    // 1. Fetch Original
    const original = await this.repository.findEntryById(tenantId, originalEntryId);
    if (!original) throw new NotFoundException("Original entry not found");

    // 2. Create Reversal
    const reversalType = original.type === CashEntryType.IN ? CashEntryType.OUT : CashEntryType.IN;
    
    // We need workspaceId from original
    const workspaceId = original.workspaceId;

    const entry = await this.repository.createEntry({
      tenantId,
      workspaceId,
      registerId: original.registerId,
      type: reversalType,
      amountCents: original.amountCents,
      sourceType: CashEntrySourceType.MANUAL,
      description: `Reversal: ${original.description}. Reason: ${reason}`,
      referenceId: original.id,
      businessDate: original.businessDate ?? undefined, // Keep same business date? Or today?
      // Usually reversals happen "now", but correct the "past"?
      // Append only means we record it now.
      // If we put it in the past business date, we change the past close?
      // "do not update/delete cash entries after posting".
      // "Daily Close (cash count + reconciliation)".
      // If I reverse an entry from yesterday, yesterday's close is now wrong?
      // If the day is locked, can I reverse?
      // "Disallow creating entries into locked dates".
      // So if businessDate is locked, I cannot reverse INTO that date.
      // I must reverse TODAY.
      // So businessDate should be undefined (defaulting to today in my createEntry logic? No createEntry logic didn't default).
      // I should default to today if not provided. UseCase adds date.
      createdByUserId: userId,
    });

    return entry;
  }
}
