import { z } from "zod";

export const OpenBukProductKey = "openbuk" as const;
export const OpenBukBookingEnabledKey = "openbuk.booking.enabled" as const;

export const OpenBukLocaleSchema = z.enum(["en", "de", "vi"]);
export type OpenBukLocale = z.infer<typeof OpenBukLocaleSchema>;

const TimeSchema = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/);
export const OpenBukHoursSchema = z
  .object({
    dayOfWeek: z.number().int().min(0).max(6),
    startTime: TimeSchema,
    endTime: TimeSchema,
  })
  .refine(
    (v) => v.startTime < v.endTime,
    "End must follow start; split overnight hours at midnight"
  );
export const OpenBukBlockSchema = z
  .object({
    startAt: z.string().datetime(),
    endAt: z.string().datetime(),
  })
  .refine((v) => Date.parse(v.startAt) < Date.parse(v.endAt), "End must follow start");
export const OpenBukSetupSchema = z
  .object({
    studioName: z.string().trim().min(1).max(120),
    timezone: z
      .string()
      .max(64)
      .refine((v) => {
        try {
          new Intl.DateTimeFormat("en", { timeZone: v });
          return true;
        } catch {
          return false;
        }
      }, "Unknown timezone"),
    locale: OpenBukLocaleSchema,
    currency: z.string().regex(/^[A-Z]{3}$/),
    serviceName: z.string().trim().min(1).max(120),
    durationMinutes: z.number().int().min(5).max(480),
    priceCents: z.number().int().min(0).max(10000000),
    bufferBeforeMinutes: z.number().int().min(0).max(120),
    bufferAfterMinutes: z.number().int().min(0).max(120),
    staffName: z.string().trim().min(1).max(120),
    weeklyHours: z.array(OpenBukHoursSchema).min(1).max(28),
    blockedTimes: z.array(OpenBukBlockSchema).max(100),
    minimumNoticeMinutes: z.number().int().min(0).max(10080),
    maximumAdvanceDays: z.number().int().min(1).max(180),
  })
  .strict();
export type OpenBukSetup = z.infer<typeof OpenBukSetupSchema>;
export const OpenBukStudioSchema = OpenBukSetupSchema.extend({
  serviceId: z.string(),
  staffId: z.string(),
  slug: z.string(),
  effectiveFrom: z.string().datetime().nullable().optional(),
  effectiveTo: z.string().datetime().nullable().optional(),
});
export type OpenBukStudio = z.infer<typeof OpenBukStudioSchema>;
export const OpenBukPublicStudioSchema = OpenBukStudioSchema.omit({
  blockedTimes: true,
  weeklyHours: true,
}).strip();
export type OpenBukPublicStudio = z.infer<typeof OpenBukPublicStudioSchema>;
export const OpenBukAvailabilityQuerySchema = z.object({
  day: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine((v) => {
      const d = new Date(v + "T00:00:00Z");
      return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
    }, "Invalid date"),
});
export const OpenBukSlotSchema = z.object({
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
});
export type OpenBukSlot = z.infer<typeof OpenBukSlotSchema>;
export const OpenBukBookSchema = z
  .object({
    serviceId: z.string().min(1).max(100),
    staffId: z.string().min(1).max(100),
    startAt: z.string().datetime(),
    customer: z
      .object({
        name: z.string().trim().min(1).max(200),
        email: z.string().trim().email().max(320),
      })
      .strict(),
    consentAccepted: z.literal(true),
  })
  .strict();
export type OpenBukBook = z.infer<typeof OpenBukBookSchema>;
export const OpenBukReceiptSchema = OpenBukSlotSchema.extend({
  reference: z.string(),
  serviceName: z.string(),
  staffName: z.string(),
  priceCents: z.number().int(),
  currency: z.string(),
  timezone: z.string(),
});
export type OpenBukReceipt = z.infer<typeof OpenBukReceiptSchema>;
export const OpenBukAppointmentSchema = OpenBukReceiptSchema.extend({
  id: z.string(),
  customerName: z.string(),
  status: z.string(),
});
export type OpenBukAppointment = z.infer<typeof OpenBukAppointmentSchema>;
