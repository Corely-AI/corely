import { z } from "zod";
import { AppointmentReviewSchema } from "@corely/contracts";
import type { TransactionContext } from "@corely/kernel";

export type ReviewScope = { tenantId: string; workspaceId: string };
export type ReviewActor = ReviewScope & { userId: string; agentId?: string };
export const AppointmentReviewRecordSchema = AppointmentReviewSchema.omit({
  id: true,
  reviewPath: true,
  delivery: true,
})
  .extend({
    fingerprint: z.string(),
    proposerId: z.string(),
    agentId: z.string().nullable(),
    reviewerId: z.string().nullable(),
  })
  .strict();
export type AppointmentReviewRecord = z.infer<typeof AppointmentReviewRecordSchema>;

export const APPOINTMENT_REVIEW_STORE = Symbol("APPOINTMENT_REVIEW_STORE");
export interface AppointmentReviewStore {
  get(
    scope: ReviewScope,
    id: string,
    tx?: TransactionContext
  ): Promise<AppointmentReviewRecord | null>;
  lock(scope: ReviewScope, id: string, tx: TransactionContext): Promise<void>;
  save(
    scope: ReviewScope,
    id: string,
    record: AppointmentReviewRecord,
    tx: TransactionContext
  ): Promise<void>;
  attempt<T>(
    tx: TransactionContext,
    run: () => Promise<T>
  ): Promise<{ ok: true; value: T } | { ok: false; error: unknown }>;
}
