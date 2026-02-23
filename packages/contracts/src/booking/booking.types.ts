import { z } from "zod";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const BookingStatusSchema = z.enum([
  "DRAFT",
  "HOLD",
  "CONFIRMED",
  "CANCELLED",
  "NO_SHOW",
  "COMPLETED",
]);
export type BookingStatus = z.infer<typeof BookingStatusSchema>;

export const ResourceTypeSchema = z.enum(["STAFF", "ROOM", "EQUIPMENT"]);
export type ResourceType = z.infer<typeof ResourceTypeSchema>;

export const AllocationRoleSchema = z.enum(["PRIMARY", "SUPPORT", "ROOM", "EQUIPMENT"]);
export type AllocationRole = z.infer<typeof AllocationRoleSchema>;

export const BookingHoldStatusSchema = z.enum(["ACTIVE", "CONFIRMED", "EXPIRED", "CANCELLED"]);
export type BookingHoldStatus = z.infer<typeof BookingHoldStatusSchema>;

// ─── Resource ─────────────────────────────────────────────────────────────────

export const ResourceDtoSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  workspaceId: z.string().nullable().optional(),
  type: ResourceTypeSchema,
  name: z.string(),
  description: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  capacity: z.number().int().nullable().optional(),
  /** arbitrary skill/tag labels */
  tags: z.array(z.string()).optional(),
  /** additional extensible attributes (colour, equipment specs, etc.) */
  attributes: z.record(z.unknown()).nullable().optional(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type ResourceDto = z.infer<typeof ResourceDtoSchema>;

// ─── Service Offering ─────────────────────────────────────────────────────────

export const ServiceOfferingDtoSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  workspaceId: z.string().nullable().optional(),
  name: z.string(),
  description: z.string().nullable().optional(),
  durationMinutes: z.number().int().positive(),
  /** optional buffer padding in minutes before the slot */
  bufferBeforeMinutes: z.number().int().nonnegative().optional(),
  /** optional buffer padding in minutes after the slot */
  bufferAfterMinutes: z.number().int().nonnegative().optional(),
  priceCents: z.number().int().nonnegative().nullable().optional(),
  currency: z.string().nullable().optional(),
  /** deposit required (cents) */
  depositCents: z.number().int().nonnegative().nullable().optional(),
  /** resource types required for this service */
  requiredResourceTypes: z.array(ResourceTypeSchema).optional(),
  /** specific skill tags required */
  requiredTags: z.array(z.string()).optional(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type ServiceOfferingDto = z.infer<typeof ServiceOfferingDtoSchema>;

// ─── Availability Rule ────────────────────────────────────────────────────────

export const WeeklyScheduleSlotSchema = z.object({
  /** 0=Sunday … 6=Saturday */
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "HH:MM"), // "09:00"
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "HH:MM"), // "18:00"
});
export type WeeklyScheduleSlot = z.infer<typeof WeeklyScheduleSlotSchema>;

export const BlackoutIntervalSchema = z.object({
  startAt: z.string(),
  endAt: z.string(),
  reason: z.string().nullable().optional(),
});
export type BlackoutInterval = z.infer<typeof BlackoutIntervalSchema>;

export const AvailabilityRuleDtoSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  resourceId: z.string(),
  /** Timezone for display; storage is always UTC */
  timezone: z.string().default("UTC"),
  /** Weekly recurring schedule */
  weeklySlots: z.array(WeeklyScheduleSlotSchema),
  /** Specific blocked intervals (holidays, closures, etc.) */
  blackouts: z.array(BlackoutIntervalSchema),
  effectiveFrom: z.string().nullable().optional(),
  effectiveTo: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type AvailabilityRuleDto = z.infer<typeof AvailabilityRuleDtoSchema>;

// ─── Booking Allocation ───────────────────────────────────────────────────────

export const BookingAllocationDtoSchema = z.object({
  id: z.string(),
  bookingId: z.string(),
  resourceId: z.string(),
  role: AllocationRoleSchema,
  startAt: z.string(),
  endAt: z.string(),
});
export type BookingAllocationDto = z.infer<typeof BookingAllocationDtoSchema>;

// ─── Booking ──────────────────────────────────────────────────────────────────

export const BookingDtoSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  workspaceId: z.string().nullable().optional(),
  status: BookingStatusSchema,
  startAt: z.string(),
  endAt: z.string(),
  /** Reference number shown to customers */
  referenceNumber: z.string().nullable().optional(),
  serviceOfferingId: z.string().nullable().optional(),
  /** Who the booking is for */
  bookedByPartyId: z.string().nullable().optional(),
  bookedByName: z.string().nullable().optional(),
  bookedByEmail: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  /** Source hold that was confirmed, if any */
  holdId: z.string().nullable().optional(),
  cancelledAt: z.string().nullable().optional(),
  cancelledReason: z.string().nullable().optional(),
  allocations: z.array(BookingAllocationDtoSchema).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type BookingDto = z.infer<typeof BookingDtoSchema>;

// ─── Hold ─────────────────────────────────────────────────────────────────────

export const BookingHoldDtoSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  workspaceId: z.string().nullable().optional(),
  status: BookingHoldStatusSchema,
  startAt: z.string(),
  endAt: z.string(),
  serviceOfferingId: z.string().nullable().optional(),
  resourceIds: z.array(z.string()),
  expiresAt: z.string(),
  confirmedBookingId: z.string().nullable().optional(),
  createdAt: z.string(),
});
export type BookingHoldDto = z.infer<typeof BookingHoldDtoSchema>;
