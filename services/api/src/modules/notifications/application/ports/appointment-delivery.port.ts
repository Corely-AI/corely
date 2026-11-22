import { z } from "zod";
import { AppointmentUpdateMessageSchema } from "@corely/contracts";
import type { TransactionContext } from "@corely/kernel";

export interface AppointmentDeliveryScope {
  tenantId: string;
  workspaceId: string;
}
export const AppointmentDeliveryRecordSchema = z
  .object({
    message: AppointmentUpdateMessageSchema,
    state: z.enum(["pending", "accepted", "failed", "superseded"]),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    deadline: z.string().datetime(),
    attempts: z.number().int().nonnegative(),
    leaseUntil: z.string().datetime().nullable(),
    providerMessageId: z.string().nullable(),
  })
  .strict();
export type AppointmentDeliveryRecord = z.infer<typeof AppointmentDeliveryRecordSchema>;

export const APPOINTMENT_DELIVERY_STORE = Symbol("APPOINTMENT_DELIVERY_STORE");
export interface AppointmentDeliveryStore {
  lock(scope: AppointmentDeliveryScope, id: string, tx: TransactionContext): Promise<void>;
  get(
    scope: AppointmentDeliveryScope,
    id: string,
    tx?: TransactionContext
  ): Promise<AppointmentDeliveryRecord | null>;
  save(
    scope: AppointmentDeliveryScope,
    id: string,
    record: AppointmentDeliveryRecord,
    tx: TransactionContext
  ): Promise<void>;
}
