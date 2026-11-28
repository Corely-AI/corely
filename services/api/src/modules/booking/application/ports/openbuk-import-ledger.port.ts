import type { TransactionContext } from "@corely/kernel";
import type { StudioScope } from "./openbuk-repository.port";

export const OPENBUK_IMPORT_LEDGER = Symbol("OPENBUK_IMPORT_LEDGER");
export type BookingImportReceipt = { fingerprint: string; bookingId: string | null };
export interface BookingImportLedger {
  get(
    scope: StudioScope,
    identity: string,
    tx: TransactionContext
  ): Promise<BookingImportReceipt | null>;
  save(
    scope: StudioScope,
    identity: string,
    receipt: BookingImportReceipt,
    tx: TransactionContext
  ): Promise<void>;
}
