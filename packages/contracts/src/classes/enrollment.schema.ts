import { z } from "zod";
import { ListQuerySchema, createListResponseSchema } from "../common/list.contract";
import { localDateSchema } from "../shared/local-date.schema";
import {
  ClassEnrollmentStatusSchema,
  ClassEnrollmentSchema,
  EnrollmentSourceSchema,
  SeatTypeSchema,
} from "./classes.types";

const enrollmentMutations = z.object({
  payerClientId: z.string().optional(),
  payerPartyId: z.string().optional().nullable(),
  startDate: localDateSchema.optional().nullable(),
  endDate: localDateSchema.optional().nullable(),
  isActive: z.boolean().optional(),
  priceOverridePerSession: z.number().int().nonnegative().optional().nullable(),
  status: ClassEnrollmentStatusSchema.optional(),
  seatType: SeatTypeSchema.optional(),
  source: EnrollmentSourceSchema.optional(),
  priceCents: z.number().int().nonnegative().optional().nullable(),
  currency: z.string().min(3).max(3).optional().nullable(),
  discountCents: z.number().int().nonnegative().optional().nullable(),
  discountLabel: z.string().optional().nullable(),
  placementLevel: z.string().optional().nullable(),
  placementGoal: z.string().optional().nullable(),
  placementNote: z.string().optional().nullable(),
});

export const UpsertEnrollmentInputSchema = z
  .object({
    classGroupId: z.string(),
    studentClientId: z.string(),
    payerClientId: z.string(),
    idempotencyKey: z.string().optional(),
  })
  .merge(enrollmentMutations);
export type UpsertEnrollmentInput = z.infer<typeof UpsertEnrollmentInputSchema>;

export const UpdateEnrollmentInputSchema = enrollmentMutations;
export type UpdateEnrollmentInput = z.infer<typeof UpdateEnrollmentInputSchema>;

export const CreateApplicationInputSchema = z.object({
  studentClientId: z.string(),
  payerClientId: z.string(),
  payerPartyId: z.string().optional().nullable(),
  placementLevel: z.string().optional().nullable(),
  placementGoal: z.string().optional().nullable(),
  placementNote: z.string().optional().nullable(),
  seatType: SeatTypeSchema.optional(),
  source: EnrollmentSourceSchema.optional(),
  idempotencyKey: z.string().optional(),
});
export type CreateApplicationInput = z.infer<typeof CreateApplicationInputSchema>;

export const ApproveApplicationInputSchema = z.object({
  payerClientId: z.string().optional(),
  payerPartyId: z.string().optional().nullable(),
  placementLevel: z.string().optional().nullable(),
  placementGoal: z.string().optional().nullable(),
  placementNote: z.string().optional().nullable(),
  priceCents: z.number().int().nonnegative().optional().nullable(),
  currency: z.string().min(3).max(3).optional().nullable(),
  discountCents: z.number().int().nonnegative().optional().nullable(),
  discountLabel: z.string().optional().nullable(),
  seatType: SeatTypeSchema.optional(),
  idempotencyKey: z.string().optional(),
});
export type ApproveApplicationInput = z.infer<typeof ApproveApplicationInputSchema>;

export const ListEnrollmentsInputSchema = ListQuerySchema.extend({
  classGroupId: z.string().optional(),
  studentClientId: z.string().optional(),
  payerClientId: z.string().optional(),
  payerPartyId: z.string().optional(),
  status: ClassEnrollmentStatusSchema.optional(),
  seatType: SeatTypeSchema.optional(),
  isActive: z.boolean().optional(),
});
export type ListEnrollmentsInput = z.infer<typeof ListEnrollmentsInputSchema>;

export const ListEnrollmentsOutputSchema = createListResponseSchema(ClassEnrollmentSchema);
export type ListEnrollmentsOutput = z.infer<typeof ListEnrollmentsOutputSchema>;
