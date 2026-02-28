import type { CashDayClose, CashEntry, CashEntryAttachment, CashRegister } from "@corely/contracts";
import type {
  CashDayCloseEntity,
  CashEntryAttachmentEntity,
  CashEntryEntity,
  CashRegisterEntity,
} from "../domain/entities";

const toContractDayCloseStatus = (status: CashDayCloseEntity["status"]): CashDayClose["status"] => {
  if (status === "OPEN") {
    return "DRAFT";
  }
  if (status === "LOCKED") {
    return "SUBMITTED";
  }
  return status;
};

export const toRegisterDto = (register: CashRegisterEntity): CashRegister => ({
  id: register.id,
  tenantId: register.tenantId,
  workspaceId: register.workspaceId,
  name: register.name,
  location: register.location,
  currency: register.currency,
  currentBalanceCents: register.currentBalanceCents,
  disallowNegativeBalance: register.disallowNegativeBalance,
  createdAt: register.createdAt.toISOString(),
  updatedAt: register.updatedAt.toISOString(),
});

export const toEntryDto = (entry: CashEntryEntity): CashEntry => ({
  id: entry.id,
  tenantId: entry.tenantId,
  workspaceId: entry.workspaceId,
  registerId: entry.registerId,
  entryNo: entry.entryNo,
  occurredAt: entry.occurredAt.toISOString(),
  dayKey: entry.dayKey,
  description: entry.description,
  type: entry.type,
  direction: entry.direction,
  source: entry.source,
  paymentMethod: entry.paymentMethod,
  amount: entry.amountCents,
  amountCents: entry.amountCents,
  currency: entry.currency,
  balanceAfterCents: entry.balanceAfterCents,
  referenceId: entry.referenceId,
  reversalOfEntryId: entry.reversalOfEntryId,
  reversedByEntryId: entry.reversedByEntryId,
  lockedByDayCloseId: entry.lockedByDayCloseId,
  createdAt: entry.createdAt.toISOString(),
  createdByUserId: entry.createdByUserId,
  sourceType: entry.source,
  businessDate: entry.dayKey,
});

export const toDayCloseDto = (close: CashDayCloseEntity): CashDayClose => ({
  id: close.id,
  tenantId: close.tenantId,
  workspaceId: close.workspaceId,
  registerId: close.registerId,
  dayKey: close.dayKey,
  expectedBalance: close.expectedBalanceCents,
  countedBalance: close.countedBalanceCents,
  difference: close.differenceCents,
  submittedAt: close.submittedAt?.toISOString() ?? null,
  submittedBy: close.submittedByUserId,
  status: toContractDayCloseStatus(close.status),
  note: close.note,
  lockedAt: close.lockedAt?.toISOString() ?? null,
  lockedByUserId: close.lockedByUserId,
  denominationCounts: close.counts.map((line) => ({
    denomination: line.denominationCents,
    count: line.count,
    subtotal: line.subtotalCents,
  })),
  createdAt: close.createdAt.toISOString(),
  updatedAt: close.updatedAt.toISOString(),

  // Legacy compatibility fields.
  businessDate: close.dayKey,
  expectedBalanceCents: close.expectedBalanceCents,
  countedBalanceCents: close.countedBalanceCents,
  differenceCents: close.differenceCents,
  closedAt: close.submittedAt?.toISOString() ?? null,
  closedByUserId: close.submittedByUserId,
});

export const toAttachmentDto = (attachment: CashEntryAttachmentEntity): CashEntryAttachment => ({
  id: attachment.id,
  tenantId: attachment.tenantId,
  workspaceId: attachment.workspaceId,
  entryId: attachment.entryId,
  documentId: attachment.documentId,
  uploadedBy: attachment.uploadedByUserId,
  createdAt: attachment.createdAt.toISOString(),
});
