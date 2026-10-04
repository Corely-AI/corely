import type {
  OpenBukAppointment,
  OpenBukBook,
  OpenBukReceipt,
  OpenBukSetup,
  OpenBukStudio,
} from "@corely/contracts";
import type { TransactionContext } from "@corely/kernel";
import type { OccupiedInterval } from "../../domain/openbuk-availability";

export type StudioScope = { tenantId: string; workspaceId: string };
export type BookingReceiptRecord = { fingerprint: string; receipt: OpenBukReceipt };
export const OPENBUK_REPOSITORY = Symbol("OPENBUK_REPOSITORY");
export interface OpenBukRepositoryPort {
  lock(scope: StudioScope, key: string, tx: TransactionContext): Promise<void>;
  isRegistered(scope: StudioScope): Promise<boolean>;
  studio(scope: StudioScope, tx?: TransactionContext): Promise<OpenBukStudio | null>;
  configure(
    scope: StudioScope,
    input: OpenBukSetup,
    slug: string,
    tx: TransactionContext
  ): Promise<OpenBukStudio>;
  occupied(
    scope: StudioScope,
    staffId: string,
    from: Date,
    to: Date,
    now: Date,
    tx?: TransactionContext
  ): Promise<OccupiedInterval[]>;
  receipt(
    scope: StudioScope,
    key: string,
    tx: TransactionContext
  ): Promise<BookingReceiptRecord | null>;
  saveReceipt(
    scope: StudioScope,
    key: string,
    record: BookingReceiptRecord,
    tx: TransactionContext
  ): Promise<void>;
  create(
    scope: StudioScope,
    studio: OpenBukStudio,
    input: OpenBukBook,
    receipt: OpenBukReceipt,
    tx: TransactionContext
  ): Promise<string>;
  appointments(scope: StudioScope, day: string): Promise<OpenBukAppointment[]>;
}
