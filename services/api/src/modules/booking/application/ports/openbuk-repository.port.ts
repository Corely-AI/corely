import type {
  OpenBukAppointment,
  OpenBukManagerBook,
  OpenBukLocale,
  OpenBukReceipt,
  OpenBukSetup,
  OpenBukSetupDraft,
  OpenBukStudio,
  OpenBukPublicService,
  OpenBukTeam,
  OpenBukTeamUpdate,
} from "@corely/contracts";
import type { TransactionContext } from "@corely/kernel";
import type { OccupiedInterval } from "../../domain/openbuk-availability";

export type StudioScope = { tenantId: string; workspaceId: string };
export type BookingReceiptRecord = {
  fingerprint: string;
  receipt: OpenBukReceipt;
  guestBookingId?: string;
};
export type OpenBukSelection = Pick<OpenBukManagerBook, "serviceId" | "staffId">;
export type OpenBukAppointmentSnapshot = OpenBukReceipt & {
  locale?: OpenBukLocale;
  confirmationEmailRequested?: boolean;
};
export type OpenBukTeamConfiguration = {
  revision: string;
  fingerprint: string;
  staffIds: string[];
  services: Pick<OpenBukTeam["services"][number], "id" | "staffIds">[];
};
export const OPENBUK_REPOSITORY = Symbol("OPENBUK_REPOSITORY");
export interface OpenBukRepositoryPort {
  lock(scope: StudioScope, key: string, tx: TransactionContext): Promise<void>;
  draft(scope: StudioScope, tx?: TransactionContext): Promise<OpenBukSetupDraft | null>;
  saveDraft(scope: StudioScope, input: OpenBukSetupDraft, tx: TransactionContext): Promise<void>;
  isRegistered(scope: StudioScope): Promise<boolean>;
  studio(
    scope: StudioScope,
    tx?: TransactionContext,
    selection?: OpenBukSelection
  ): Promise<OpenBukStudio | null>;
  studioSettings(scope: StudioScope): Promise<OpenBukStudio | null>;
  publicCatalog(
    scope: StudioScope
  ): Promise<{ studio: OpenBukStudio; services?: OpenBukPublicService[] } | null>;
  team(scope: StudioScope, now: Date, tx?: TransactionContext): Promise<OpenBukTeam | null>;
  saveTeam(
    scope: StudioScope,
    input: OpenBukTeamUpdate,
    fingerprint: string,
    now: Date,
    tx: TransactionContext
  ): Promise<{ team: OpenBukTeam; changed: boolean }>;
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
    tx?: TransactionContext,
    excludeBookingId?: string
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
  snapshot(
    scope: StudioScope,
    bookingId: string,
    tx?: TransactionContext
  ): Promise<OpenBukAppointmentSnapshot | null>;
  create(
    scope: StudioScope,
    studio: OpenBukStudio,
    input: OpenBukManagerBook,
    receipt: OpenBukReceipt,
    tx: TransactionContext,
    createdByUserId?: string,
    confirmationEmailRequested?: boolean
  ): Promise<string>;
  appointments(scope: StudioScope, day: string): Promise<OpenBukAppointment[]>;
}
