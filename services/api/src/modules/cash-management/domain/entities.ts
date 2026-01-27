import { CashEntryType, CashEntrySourceType, DailyCloseStatus } from "@corely/contracts";

export class CashRegisterEntity {
  constructor(
    public readonly id: string,
    public readonly tenantId: string,
    public readonly workspaceId: string,
    public readonly name: string,
    public readonly currency: string,
    public readonly currentBalanceCents: number,
    public readonly location: string | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}
}

export class CashEntryEntity {
  constructor(
    public readonly id: string,
    public readonly tenantId: string,
    public readonly workspaceId: string,
    public readonly registerId: string,
    public readonly type: CashEntryType,
    public readonly amountCents: number,
    public readonly sourceType: CashEntrySourceType,
    public readonly description: string,
    public readonly referenceId: string | null,
    public readonly businessDate: string | null,
    public readonly createdByUserId: string,
    public readonly createdAt: Date,
  ) {}
}

export class CashDayCloseEntity {
  constructor(
    public readonly id: string,
    public readonly tenantId: string,
    public readonly workspaceId: string,
    public readonly registerId: string,
    public readonly businessDate: string,
    public readonly status: DailyCloseStatus,
    public readonly expectedBalanceCents: number,
    public readonly countedBalanceCents: number,
    public readonly differenceCents: number,
    public readonly notes: string | null,
    public readonly closedAt: Date | null,
    public readonly closedByUserId: string | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}
}
