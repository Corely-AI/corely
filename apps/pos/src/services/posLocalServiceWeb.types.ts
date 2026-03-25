import type { ShiftCashEventType } from "@/offline/posOutbox";

export type ShiftCashEventRow = {
  eventId: string;
  sessionId: string;
  eventType: ShiftCashEventType;
  amountCents: number;
  reason: string | null;
  occurredAt: Date;
  syncStatus: "PENDING" | "SYNCED" | "FAILED";
  lastError: string | null;
};
