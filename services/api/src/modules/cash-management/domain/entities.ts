import type {
  CashDayCloseStatus,
  CashPaymentMethod as CashPaymentMethodType,
  CashEntryDirection,
  CashEntrySource,
  CashEntryType,
} from "@corely/contracts";

export type CashRegisterEntity = {
  id: string;
  tenantId: string;
  workspaceId: string;
  name: string;
  location: string | null;
  currency: string;
  currentBalanceCents: number;
  disallowNegativeBalance: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type CashEntryEntity = {
  id: string;
  tenantId: string;
  workspaceId: string;
  registerId: string;
  entryNo: number;
  occurredAt: Date;
  dayKey: string;
  description: string;
  type: CashEntryType;
  direction: CashEntryDirection;
  source: CashEntrySource;
  paymentMethod: CashPaymentMethodType;
  amountCents: number;
  currency: string;
  balanceAfterCents: number;
  referenceId: string | null;
  reversalOfEntryId: string | null;
  reversedByEntryId: string | null;
  lockedByDayCloseId: string | null;
  createdAt: Date;
  createdByUserId: string;
};

export type CashDenominationCountEntity = {
  denominationCents: number;
  count: number;
  subtotalCents: number;
};

export type CashDayCloseEntity = {
  id: string;
  tenantId: string;
  workspaceId: string;
  registerId: string;
  dayKey: string;
  expectedBalanceCents: number;
  countedBalanceCents: number;
  differenceCents: number;
  status: CashDayCloseStatus;
  note: string | null;
  submittedAt: Date | null;
  submittedByUserId: string | null;
  lockedAt: Date | null;
  lockedByUserId: string | null;
  counts: CashDenominationCountEntity[];
  createdAt: Date;
  updatedAt: Date;
};

export type CashEntryAttachmentEntity = {
  id: string;
  tenantId: string;
  workspaceId: string;
  entryId: string;
  documentId: string;
  uploadedByUserId: string | null;
  createdAt: Date;
};

export type CashExportArtifactEntity = {
  id: string;
  tenantId: string;
  workspaceId: string;
  registerId: string;
  month: string;
  format: string;
  fileName: string;
  contentType: string;
  contentBase64: string;
  sizeBytes: number;
  createdByUserId: string | null;
  createdAt: Date;
  expiresAt: Date | null;
};
