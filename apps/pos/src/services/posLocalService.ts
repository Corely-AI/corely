import type * as SQLite from "expo-sqlite";
import type { ProductSnapshot, ShiftSession } from "@corely/contracts";
import {
  getLastCatalogSyncAt,
  getProductByBarcode,
  listCatalog,
  replaceCatalogSnapshot,
  searchCatalog,
  updateLastCatalogSync,
} from "@/services/posLocalService.catalog";
import {
  createSaleAndEnqueue,
  getSaleById,
  markSaleSyncFailure,
  markSaleSynced,
} from "@/services/posLocalService.sales";
import {
  closeShiftAndEnqueue,
  createShiftCashEventAndEnqueue,
  getCurrentOpenShift,
  getShiftCashEventTotals,
  listShiftCashEvents,
  markShiftCashEventFailed,
  markShiftCashEventSynced,
  openShiftAndEnqueue,
  upsertShiftSession,
} from "@/services/posLocalService.shift";
import type {
  CreateSaleAndEnqueueInput,
  SaleCreateResult,
  ShiftCashEventInput,
  ShiftCashEventRecord,
  ShiftCashEventTotals,
  ShiftCloseInput,
  ShiftOpenInput,
} from "@/services/posLocalService.types";

export type {
  CartLineInput,
  CreateSaleAndEnqueueInput,
  SaleCreateResult,
  ShiftCashEventInput,
  ShiftCloseInput,
  ShiftOpenInput,
} from "@/services/posLocalService.types";

export class PosLocalService {
  constructor(private readonly db: SQLite.SQLiteDatabase) {}

  async replaceCatalogSnapshot(
    products: ProductSnapshot[],
    options?: { resetBeforeUpsert?: boolean }
  ): Promise<void> {
    return replaceCatalogSnapshot(this.db, products, options);
  }

  async searchCatalog(query: string): Promise<ProductSnapshot[]> {
    return searchCatalog(this.db, query);
  }

  async listCatalog(limit = 200): Promise<ProductSnapshot[]> {
    return listCatalog(this.db, limit);
  }

  async getProductByBarcode(barcode: string): Promise<ProductSnapshot | null> {
    return getProductByBarcode(this.db, barcode);
  }

  async createSaleAndEnqueue(input: CreateSaleAndEnqueueInput): Promise<SaleCreateResult> {
    return createSaleAndEnqueue(this.db, input);
  }

  async getSaleById(posSaleId: string) {
    return getSaleById(this.db, posSaleId);
  }

  async markSaleSynced(
    posSaleId: string,
    output: {
      serverInvoiceId?: string;
      serverPaymentId?: string;
    }
  ): Promise<void> {
    return markSaleSynced(this.db, posSaleId, output);
  }

  async markSaleSyncFailure(posSaleId: string, reason: string): Promise<void> {
    return markSaleSyncFailure(this.db, posSaleId, reason);
  }

  async getCurrentOpenShift(registerId: string): Promise<ShiftSession | null> {
    return getCurrentOpenShift(this.db, registerId);
  }

  async upsertShiftSession(session: ShiftSession): Promise<void> {
    return upsertShiftSession(this.db, session);
  }

  async openShiftAndEnqueue(input: ShiftOpenInput): Promise<ShiftSession> {
    return openShiftAndEnqueue(this.db, input);
  }

  async closeShiftAndEnqueue(input: ShiftCloseInput): Promise<ShiftSession> {
    return closeShiftAndEnqueue(this.db, input);
  }

  async createShiftCashEventAndEnqueue(input: ShiftCashEventInput): Promise<void> {
    return createShiftCashEventAndEnqueue(this.db, input);
  }

  async markShiftCashEventSynced(eventId: string): Promise<void> {
    return markShiftCashEventSynced(this.db, eventId);
  }

  async markShiftCashEventFailed(eventId: string, error: string): Promise<void> {
    return markShiftCashEventFailed(this.db, eventId, error);
  }

  async getShiftCashEventTotals(sessionId: string): Promise<ShiftCashEventTotals> {
    return getShiftCashEventTotals(this.db, sessionId);
  }

  async listShiftCashEvents(sessionId: string): Promise<ShiftCashEventRecord[]> {
    return listShiftCashEvents(this.db, sessionId);
  }

  async updateLastCatalogSync(at: Date): Promise<void> {
    return updateLastCatalogSync(this.db, at);
  }

  async getLastCatalogSyncAt(): Promise<Date | null> {
    return getLastCatalogSyncAt(this.db);
  }
}
