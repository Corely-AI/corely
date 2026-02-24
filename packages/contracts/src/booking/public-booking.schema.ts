import { z } from "zod";
import { CurrencyCodeSchema } from "../money/currency.schema";
import { BookingDtoSchema, BookingHoldDtoSchema } from "./booking.types";

export const PublicBookingPageSlugSchema = z
  .string()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9-]+$/i);

export const PublicBookingAddressSchema = z.object({
  line1: z.string().optional().nullable(),
  line2: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  postalCode: z.string().optional().nullable(),
  countryCode: z.string().optional().nullable(),
});
export type PublicBookingAddress = z.infer<typeof PublicBookingAddressSchema>;

export const PublicBookingPageSchema = z.object({
  slug: PublicBookingPageSlugSchema,
  venueName: z.string().min(1),
  description: z.string().optional().nullable(),
  timezone: z.string().default("UTC"),
  address: PublicBookingAddressSchema.optional().nullable(),
  openingHoursText: z.string().optional().nullable(),
  cancellationPolicyText: z.string().optional().nullable(),
  cancellationCutoffHours: z.number().int().nonnegative().optional().nullable(),
  depositPolicyText: z.string().optional().nullable(),
  heroImageFileIds: z.array(z.string()).default([]),
  allowStaffSelection: z.boolean().default(true),
});
export type PublicBookingPage = z.infer<typeof PublicBookingPageSchema>;

export const PublicBookingServiceSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  durationMinutes: z.number().int().positive(),
  priceCents: z.number().int().nonnegative().optional().nullable(),
  currency: CurrencyCodeSchema.optional().nullable(),
  depositCents: z.number().int().nonnegative().optional().nullable(),
  category: z.string().optional().nullable(),
  badges: z.array(z.string()).default([]),
});
export type PublicBookingService = z.infer<typeof PublicBookingServiceSchema>;

export const PublicBookingStaffSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  tags: z.array(z.string()).default([]),
});
export type PublicBookingStaff = z.infer<typeof PublicBookingStaffSchema>;

export const PublicBookingPageOutputSchema = z.object({
  page: PublicBookingPageSchema,
  services: z.array(PublicBookingServiceSchema),
  staff: z.array(PublicBookingStaffSchema),
});
export type PublicBookingPageOutput = z.infer<typeof PublicBookingPageOutputSchema>;

export const PublicBookingServicesOutputSchema = z.object({
  services: z.array(PublicBookingServiceSchema),
});
export type PublicBookingServicesOutput = z.infer<typeof PublicBookingServicesOutputSchema>;

export const PublicBookingAvailabilityInputSchema = z.object({
  serviceId: z.string(),
  staffId: z.string().optional(),
  from: z.string().datetime(),
  to: z.string().datetime(),
  day: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});
export type PublicBookingAvailabilityInput = z.infer<typeof PublicBookingAvailabilityInputSchema>;

export const PublicBookingTimeSlotSchema = z.object({
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  resourceId: z.string(),
  staffId: z.string().nullable(),
  staffName: z.string().nullable(),
});
export type PublicBookingTimeSlot = z.infer<typeof PublicBookingTimeSlotSchema>;

export const PublicBookingAvailabilityOutputSchema = z.object({
  timezone: z.string(),
  availableDays: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  timeSlots: z.array(PublicBookingTimeSlotSchema),
});
export type PublicBookingAvailabilityOutput = z.infer<typeof PublicBookingAvailabilityOutputSchema>;

export const PublicCreateBookingHoldInputSchema = z.object({
  serviceId: z.string(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  staffId: z.string().optional(),
  resourceId: z.string().optional(),
  customerName: z.string().min(1).max(200).optional(),
  customerEmail: z.string().email().optional(),
  notes: z.string().max(2000).optional().nullable(),
  ttlSeconds: z.number().int().positive().max(3600).default(600),
  idempotencyKey: z.string().optional(),
});
export type PublicCreateBookingHoldInput = z.infer<typeof PublicCreateBookingHoldInputSchema>;

export const PublicCreateBookingHoldOutputSchema = z.object({
  hold: BookingHoldDtoSchema,
});
export type PublicCreateBookingHoldOutput = z.infer<typeof PublicCreateBookingHoldOutputSchema>;

export const PublicBookingCustomerSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email(),
  phone: z.string().min(3).max(30).optional().nullable(),
});
export type PublicBookingCustomer = z.infer<typeof PublicBookingCustomerSchema>;

export const PublicConfirmBookingInputSchema = z.object({
  holdId: z.string().optional(),
  serviceId: z.string().optional(),
  startAt: z.string().datetime().optional(),
  endAt: z.string().datetime().optional(),
  staffId: z.string().optional(),
  notes: z.string().max(2000).optional().nullable(),
  marketingConsent: z.boolean().optional(),
  consentAccepted: z.literal(true),
  customer: PublicBookingCustomerSchema,
  idempotencyKey: z.string().optional(),
});
export type PublicConfirmBookingInput = z.infer<typeof PublicConfirmBookingInputSchema>;

export const PublicConfirmBookingOutputSchema = z.object({
  booking: BookingDtoSchema,
});
export type PublicConfirmBookingOutput = z.infer<typeof PublicConfirmBookingOutputSchema>;

export const PublicBookingSummarySchema = z.object({
  id: z.string(),
  referenceNumber: z.string().nullable().optional(),
  status: z.string(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  venueName: z.string(),
  serviceName: z.string().nullable().optional(),
  staffName: z.string().nullable().optional(),
  customerName: z.string().nullable().optional(),
  customerEmail: z.string().nullable().optional(),
  address: PublicBookingAddressSchema.optional().nullable(),
  timezone: z.string(),
});
export type PublicBookingSummary = z.infer<typeof PublicBookingSummarySchema>;

export const PublicBookingSummaryOutputSchema = z.object({
  booking: PublicBookingSummarySchema,
});
export type PublicBookingSummaryOutput = z.infer<typeof PublicBookingSummaryOutputSchema>;
