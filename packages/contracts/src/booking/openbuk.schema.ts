import { corelyLocales } from "../localization";
import { z } from "zod";

export const OpenBukProductKey = "openbuk" as const;
export const OpenBukBookingEnabledKey = "openbuk.booking.enabled" as const;

export const OpenBukLocaleSchema = z.enum(corelyLocales);
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
const OpenBukNameSchema = z.string().trim().min(1).max(120);
const OpenBukIdSchema = z.string().min(1).max(100);
const OpenBukServiceFields = {
  serviceName: OpenBukNameSchema,
  durationMinutes: z.number().int().min(5).max(480),
  priceCents: z.number().int().min(0).max(10000000),
  bufferBeforeMinutes: z.number().int().min(0).max(120),
  bufferAfterMinutes: z.number().int().min(0).max(120),
};
export const OpenBukSetupSchema = z
  .object({
    studioName: z.string().trim().min(1).max(120),
    timezone: z
      .string()
      .max(64)
      .refine((v) => {
        if (/^[+-]/.test(v)) {
          return false;
        }
        try {
          new Intl.DateTimeFormat("en", { timeZone: v });
          return true;
        } catch {
          return false;
        }
      }, "Unknown timezone"),
    locale: OpenBukLocaleSchema,
    currency: z.string().regex(/^[A-Z]{3}$/),
    ...OpenBukServiceFields,
    staffName: OpenBukNameSchema,
    weeklyHours: z.array(OpenBukHoursSchema).min(1).max(28),
    blockedTimes: z.array(OpenBukBlockSchema).max(100),
    minimumNoticeMinutes: z.number().int().min(0).max(10080),
    maximumAdvanceDays: z.number().int().min(1).max(180),
  })
  .strict();
export const OpenBukSetupDraftSchema = OpenBukSetupSchema.partial().extend({
  weeklyHours: z.array(OpenBukHoursSchema).max(28).optional(),
});
export const OpenBukSetupDraftResponseSchema = z.object({
  draft: OpenBukSetupDraftSchema.nullable(),
});
export type OpenBukSetupDraftResponse = z.infer<typeof OpenBukSetupDraftResponseSchema>;
export type OpenBukSetupDraft = z.infer<typeof OpenBukSetupDraftSchema>;
export type OpenBukSetup = z.infer<typeof OpenBukSetupSchema>;
export const OpenBukStudioSchema = OpenBukSetupSchema.extend({
  serviceId: z.string(),
  staffId: z.string(),
  slug: z.string(),
  effectiveFrom: z.string().datetime().nullable().optional(),
  effectiveTo: z.string().datetime().nullable().optional(),
});
export const OpenBukStudioResponseSchema = z.object({
  studio: OpenBukStudioSchema.nullable(),
  canManage: z.boolean(),
});
export type OpenBukStudioResponse = z.infer<typeof OpenBukStudioResponseSchema>;
export type OpenBukStudio = z.infer<typeof OpenBukStudioSchema>;
const OpenBukPublicServiceSchema = z.object({
  ...OpenBukServiceFields,
  serviceId: OpenBukIdSchema,
  currency: OpenBukSetupSchema.shape.currency,
  staff: z
    .array(
      z.object({
        staffId: OpenBukIdSchema,
        staffName: OpenBukNameSchema,
        timezone: OpenBukSetupSchema.shape.timezone,
      })
    )
    .min(1),
});
export type OpenBukPublicService = z.infer<typeof OpenBukPublicServiceSchema>;
export const OpenBukPublicStudioSchema = OpenBukStudioSchema.omit({
  blockedTimes: true,
  weeklyHours: true,
})
  .extend({ services: z.array(OpenBukPublicServiceSchema).optional() })
  .strip();
export type OpenBukPublicStudio = z.infer<typeof OpenBukPublicStudioSchema>;
export const OpenBukDaySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((v) => {
    const d = new Date(v + "T00:00:00Z");
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
  }, "Invalid date");
export const OpenBukAvailabilityQuerySchema = z
  .object({
    day: OpenBukDaySchema,
    serviceId: OpenBukIdSchema.optional(),
    staffId: OpenBukIdSchema.optional(),
  })
  .refine(
    (query) => Boolean(query.serviceId) === Boolean(query.staffId),
    "Select a service and staff member"
  );
const OpenBukTeamStaffSchema = z
  .object({
    id: OpenBukIdSchema,
    staffName: OpenBukNameSchema,
    active: z.boolean(),
  })
  .strict();
const OpenBukTeamServiceSchema = z
  .object({
    ...OpenBukServiceFields,
    id: OpenBukIdSchema,
    active: z.boolean(),
    staffIds: z.array(OpenBukIdSchema).max(30),
  })
  .strict();
export const OpenBukTeamUpdateSchema = z
  .object({
    revision: z.string().uuid().nullable(),
    updateId: z.string().uuid(),
    staff: z
      .array(OpenBukTeamStaffSchema.extend({ create: z.literal(true).optional() }))
      .min(1)
      .max(30),
    services: z
      .array(OpenBukTeamServiceSchema.extend({ create: z.literal(true).optional() }))
      .min(1)
      .max(60),
  })
  .strict()
  .superRefine(({ staff, services }, ctx) => {
    const staffIds = new Set(staff.map((member) => member.id));
    if (
      staffIds.size !== staff.length ||
      new Set(services.map((service) => service.id)).size !== services.length
    ) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Duplicate booking records" });
    }
    services.forEach((service, index) => {
      if (
        new Set(service.staffIds).size !== service.staffIds.length ||
        service.staffIds.some((id) => !staffIds.has(id)) ||
        (service.active && !service.staffIds.length)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["services", index, "staffIds"],
          message: "Select eligible staff from this studio",
        });
      }
    });
    for (const record of [...staff, ...services]) {
      if (record.create && !z.string().uuid().safeParse(record.id).success) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "New booking records require UUIDs" });
      }
    }
  });
export type OpenBukTeamUpdate = z.infer<typeof OpenBukTeamUpdateSchema>;
export const OpenBukTeamSchema = z.object({
  revision: z.string().uuid().nullable(),
  currency: OpenBukSetupSchema.shape.currency,
  primaryServiceId: OpenBukIdSchema,
  primaryStaffId: OpenBukIdSchema,
  staff: z.array(
    OpenBukTeamStaffSchema.extend({ futureCommitments: z.number().int().nonnegative() })
  ),
  services: z.array(
    OpenBukTeamServiceSchema.extend({ futureCommitments: z.number().int().nonnegative() })
  ),
});
export type OpenBukTeam = z.infer<typeof OpenBukTeamSchema>;
export const OpenBukSlotSchema = z.object({
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
});
export type OpenBukSlot = z.infer<typeof OpenBukSlotSchema>;
export const OpenBukBookSchema = z
  .object({
    serviceId: OpenBukIdSchema,
    staffId: OpenBukIdSchema,
    startAt: z.string().datetime(),
    customer: z
      .object({
        name: z.string().trim().min(1).max(200),
        email: z.string().trim().email().max(320),
      })
      .strict(),
    consentAccepted: z.literal(true),
    locale: OpenBukLocaleSchema.optional(),
    confirmationEmailRequested: z.boolean().optional(),
  })
  .strict();
export type OpenBukBook = z.infer<typeof OpenBukBookSchema>;
export const OpenBukManagerBookSchema = OpenBukBookSchema.omit({
  consentAccepted: true,
  confirmationEmailRequested: true,
});
export type OpenBukManagerBook = z.infer<typeof OpenBukManagerBookSchema>;
export const OpenBukReceiptSchema = OpenBukSlotSchema.extend({
  reference: z.string(),
  serviceName: z.string(),
  staffName: z.string(),
  priceCents: z.number().int(),
  currency: z.string(),
  timezone: z.string(),
});
export type OpenBukReceipt = z.infer<typeof OpenBukReceiptSchema>;
export const OpenBukManagementAccessSchema = z.object({
  token: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
  expiresAt: z.string().datetime(),
});
export const OpenBukPublicBookResponseSchema = z.object({
  receipt: OpenBukReceiptSchema,
  management: OpenBukManagementAccessSchema.optional(),
});
export type OpenBukPublicBookResponse = z.infer<typeof OpenBukPublicBookResponseSchema>;

const ManagementTokenSchema = z.string().max(256);
export const OpenBukManageInputSchema = z.object({ token: ManagementTokenSchema }).strict();
export const OpenBukManageAvailabilityInputSchema = OpenBukManageInputSchema.extend({
  day: OpenBukDaySchema,
});
export const OpenBukManageCancelInputSchema = OpenBukManageInputSchema.extend({
  version: z.string().datetime(),
});
export const OpenBukManageMoveInputSchema = OpenBukManageCancelInputSchema.extend({
  startAt: z.string().datetime(),
});
export const OpenBukManageDetailsSchema = OpenBukSlotSchema.extend({
  reference: z.string(),
  serviceName: z.string(),
  staffName: z.string(),
  timezone: z.string(),
  version: z.string().datetime(),
  canMove: z.boolean(),
});
export type OpenBukManageDetails = z.infer<typeof OpenBukManageDetailsSchema>;
export const OpenBukAppointmentSchema = OpenBukReceiptSchema.extend({
  id: z.string(),
  customerName: z.string(),
  status: z.string(),
  version: z.string().datetime().optional(),
  serviceId: OpenBukIdSchema.nullable().optional(),
  staffId: OpenBukIdSchema.nullable().optional(),
});
export type OpenBukAppointment = z.infer<typeof OpenBukAppointmentSchema>;

export const OpenBukAgendaQuerySchema = z
  .object({
    day: OpenBukDaySchema,
    span: z.enum(["day", "week"]).default("day"),
    serviceId: OpenBukIdSchema.optional(),
    staffId: OpenBukIdSchema.optional(),
  })
  .refine(
    (query) => Boolean(query.serviceId) === Boolean(query.staffId),
    "Select a service and staff member"
  );
export type OpenBukAgendaQuery = z.infer<typeof OpenBukAgendaQuerySchema>;
export const OpenBukAgendaSchema = z.object({
  timezone: z.string(),
  services: z.array(OpenBukPublicServiceSchema),
  selection: z.object({ serviceId: OpenBukIdSchema, staffId: OpenBukIdSchema }).nullable(),
  days: z.array(
    z.object({
      day: OpenBukDaySchema,
      appointments: z.array(OpenBukAppointmentSchema),
      slots: z.array(OpenBukSlotSchema),
    })
  ),
});
export type OpenBukAgenda = z.infer<typeof OpenBukAgendaSchema>;

export const OpenBukManagerCancelSchema = z
  .object({ bookingId: OpenBukIdSchema, version: z.string().datetime() })
  .strict();
export type OpenBukManagerCancel = z.infer<typeof OpenBukManagerCancelSchema>;

export const OpenBukReplacementInputSchema = z
  .object({
    bookingId: z.string().uuid(),
    startAt: z.string().datetime({ offset: true }),
  })
  .strict();
export type OpenBukReplacementInput = z.infer<typeof OpenBukReplacementInputSchema>;

const OpenBukReplacementTimeSchema = OpenBukSlotSchema.extend({
  resourceId: z.string(),
  resourceName: z.string(),
}).strict();
export const OpenBukReplacementSchema = z
  .object({
    bookingId: z.string().uuid(),
    reference: z.string(),
    version: z.string().datetime(),
    timezone: z.string(),
    current: OpenBukReplacementTimeSchema,
    replacement: OpenBukReplacementTimeSchema,
  })
  .strict();
export type OpenBukReplacement = z.infer<typeof OpenBukReplacementSchema>;
