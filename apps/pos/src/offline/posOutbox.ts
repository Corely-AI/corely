import { v4 as uuidv4 } from "@lukeed/uuid";
import type { OpenShiftInput, CloseShiftInput, SyncPosSaleInput } from "@corely/contracts";
import type { OutboxCommand } from "@corely/offline-core";

export const PosCommandTypes = {
  SaleFinalize: "pos.sale.finalize",
  ShiftOpen: "pos.shift.open",
  ShiftClose: "pos.shift.close",
  ShiftCashEvent: "pos.shift.cash-event",
} as const;

export type PosCommandType = (typeof PosCommandTypes)[keyof typeof PosCommandTypes];

export type ShiftCashEventType = "PAID_IN" | "PAID_OUT";

export interface ShiftCashEventCommandPayload {
  eventId: string;
  sessionId: string;
  registerId: string;
  eventType: ShiftCashEventType;
  amountCents: number;
  reason: string | null;
  occurredAt: string;
}

export type PosCommandPayload =
  | SyncPosSaleInput
  | OpenShiftInput
  | CloseShiftInput
  | ShiftCashEventCommandPayload;

export const buildDeterministicIdempotencyKey = {
  saleFinalize: (saleId: string) => `sale:${saleId}:finalize:v1`,
  shiftOpen: (sessionId: string) => `shift:${sessionId}:open:v1`,
  shiftClose: (sessionId: string) => `shift:${sessionId}:close:v1`,
  shiftCashEvent: (eventId: string) => `shift-cash:${eventId}:v1`,
};

export function createPosOutboxCommand<TPayload>(
  workspaceId: string,
  type: PosCommandType,
  payload: TPayload,
  idempotencyKey: string
): OutboxCommand<TPayload> {
  return {
    commandId: uuidv4(),
    workspaceId,
    type,
    payload,
    createdAt: new Date(),
    status: "PENDING",
    attempts: 0,
    idempotencyKey,
  };
}
