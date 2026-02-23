import { z } from "zod";
import { BookingDtoSchema, BookingStatusSchema } from "./booking.types";

const QueryNumberSchema = z.preprocess((value) => {
  if (value == null || value === "") {return undefined;}
  if (typeof value === "string") {
    const numeric = Number(value);
    return Number.isNaN(numeric) ? value : numeric;
  }
  return value;
}, z.number().int().positive());

// ─── Create Booking (confirm from hold OR direct) ─────────────────────────────

export const CreateBookingInputSchema = z.object({
  /** Either provide a holdId (to confirm) OR provide startAt/endAt+resourceIds for direct booking */
  holdId: z.string().optional().nullable(),

  /** Required for direct bookings (no hold) */
  startAt: z.string().datetime().optional(),
  endAt: z.string().datetime().optional(),
  resourceIds: z.array(z.string()).optional(),
  serviceOfferingId: z.string().optional().nullable(),

  bookedByPartyId: z.string().optional().nullable(),
  bookedByName: z.string().optional().nullable(),
  bookedByEmail: z.string().email().optional().nullable(),
  notes: z.string().optional().nullable(),
  idempotencyKey: z.string().optional(),
});
export type CreateBookingInput = z.infer<typeof CreateBookingInputSchema>;

export const CreateBookingOutputSchema = z.object({ booking: BookingDtoSchema });
export type CreateBookingOutput = z.infer<typeof CreateBookingOutputSchema>;

// ─── Reschedule Booking ───────────────────────────────────────────────────────

export const RescheduleBookingInputSchema = z.object({
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  notes: z.string().optional().nullable(),
  idempotencyKey: z.string().optional(),
});
export type RescheduleBookingInput = z.infer<typeof RescheduleBookingInputSchema>;

// ─── Cancel Booking ───────────────────────────────────────────────────────────

export const CancelBookingInputSchema = z.object({
  reason: z.string().optional().nullable(),
  idempotencyKey: z.string().optional(),
});
export type CancelBookingInput = z.infer<typeof CancelBookingInputSchema>;

// ─── Update Booking ───────────────────────────────────────────────────────────

export const UpdateBookingInputSchema = z.object({
  bookedByPartyId: z.string().optional().nullable(),
  bookedByName: z.string().optional().nullable(),
  bookedByEmail: z.string().email().optional().nullable(),
  notes: z.string().optional().nullable(),
  resourceIds: z.array(z.string()).optional(),
});
export type UpdateBookingInput = z.infer<typeof UpdateBookingInputSchema>;

// ─── List Bookings ────────────────────────────────────────────────────────────

export const ListBookingsInputSchema = z.object({
  q: z.string().optional(),
  page: QueryNumberSchema.optional(),
  pageSize: QueryNumberSchema.optional(),
  sort: z.string().optional(),
  status: BookingStatusSchema.optional(),
  resourceId: z.string().optional(),
  serviceOfferingId: z.string().optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
  bookedByPartyId: z.string().optional(),
});
export type ListBookingsInput = z.infer<typeof ListBookingsInputSchema>;

export const BookingOutputSchema = z.object({ booking: BookingDtoSchema });
export type BookingOutput = z.infer<typeof BookingOutputSchema>;
