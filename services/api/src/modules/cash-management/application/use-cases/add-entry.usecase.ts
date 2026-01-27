import { Inject, Injectable } from "@nestjs/common";
import { CreateCashEntry, CashEntryType, DailyCloseStatus } from "@corely/contracts";
import type { CashRepositoryPort } from "../ports/cash-repository.port";
import { CASH_REPOSITORY } from "../ports/cash-repository.port";
import { CashEntryEntity } from "../../domain/entities";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { OUTBOX_PORT } from "@corely/kernel";
import type { OutboxPort } from "@corely/kernel";

@Injectable()
export class AddEntryUseCase {
  constructor(
    @Inject(CASH_REPOSITORY) private readonly repository: CashRepositoryPort,
    @Inject(OUTBOX_PORT) private readonly outbox: OutboxPort
  ) {}

  async execute(
    data: CreateCashEntry & { tenantId: string; workspaceId: string; createdByUserId: string }
  ): Promise<CashEntryEntity> {
    const { tenantId, registerId, amountCents, type, businessDate } = data;

    // 1. Fetch Register
    const register = await this.repository.findById(tenantId, registerId);
    if (!register) throw new NotFoundException("Cash Register not found");

    // 2. Validation: Negative Balance
    if (type === CashEntryType.OUT) {
      if (register.currentBalanceCents < amountCents) {
         // Could make configurable, but requirement says "by default"
         throw new BadRequestException("Insufficient funds in register");
      }
    }

    // 3. Validation: Locked Period
    if (businessDate) {
      const close = await this.repository.findDailyClose(tenantId, registerId, businessDate);
      if (close && close.status === DailyCloseStatus.LOCKED) {
        throw new BadRequestException(`Date ${businessDate} is locked`);
      }
    }

    // 4. Create Entry
    const entry = await this.repository.createEntry(data);
    
    // 5. Emit Event
    await this.outbox.enqueue({
      tenantId: data.tenantId,
      eventType: "cash.entry.created",
      payload: {
        entryId: entry.id,
        registerId: entry.registerId,
        amountCents: entry.amountCents,
        type: entry.type, // "IN" or "OUT"
        sourceType: entry.sourceType,
        businessDate: entry.businessDate,
      },
    });

    return entry;
  }
}
