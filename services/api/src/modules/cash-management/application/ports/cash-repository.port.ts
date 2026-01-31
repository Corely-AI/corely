import {
  type CashRegisterEntity,
  type CashEntryEntity,
  type CashDayCloseEntity,
} from "../../domain/entities";
import { type CreateCashRegister, type CreateCashEntry } from "@corely/contracts";

export const CASH_REPOSITORY = Symbol("CASH_REPOSITORY");

export interface CashRepositoryPort {
  // Registers
  createRegister(
    data: CreateCashRegister & { tenantId: string; workspaceId: string }
  ): Promise<CashRegisterEntity>;
  findById(tenantId: string, id: string): Promise<CashRegisterEntity | null>;
  findAll(tenantId: string, workspaceId: string): Promise<CashRegisterEntity[]>;
  updateRegister(
    tenantId: string,
    id: string,
    data: Partial<CashRegisterEntity>
  ): Promise<CashRegisterEntity>;

  // Entries
  createEntry(
    data: CreateCashEntry & { tenantId: string; workspaceId: string; createdByUserId: string }
  ): Promise<CashEntryEntity>;
  findEntries(
    tenantId: string,
    registerId: string,
    filters?: { from?: string; to?: string }
  ): Promise<CashEntryEntity[]>;
  findEntryById(tenantId: string, id: string): Promise<CashEntryEntity | null>;

  // Daily Close
  saveDailyClose(data: CashDayCloseEntity): Promise<CashDayCloseEntity>; // Generalized save (upsert/create)
  findDailyClose(
    tenantId: string,
    registerId: string,
    businessDate: string
  ): Promise<CashDayCloseEntity | null>;
  findDailyCloses(
    tenantId: string,
    registerId: string,
    from: string,
    to: string
  ): Promise<CashDayCloseEntity[]>;
}
