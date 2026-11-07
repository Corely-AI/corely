import { z } from "zod";

const date = z.string().date();
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const window = z.object({ startTime: time, endTime: time }).strict();
export const StaffPatternSchema = z
  .object({
    timezone: z
      .string()
      .max(100)
      .refine((value) => {
        try {
          new Intl.DateTimeFormat("en", { timeZone: value });
          return true;
        } catch {
          return false;
        }
      }, "Use an IANA timezone"),
    effectiveFrom: date,
    effectiveUntil: date.nullable().default(null),
    weeklyHours: z.array(window.extend({ dayOfWeek: z.number().int().min(0).max(6) })).max(56),
    exceptions: z.array(z.object({ date, windows: z.array(window).max(8) }).strict()).max(366),
  })
  .strict()
  .superRefine((value, ctx) => {
    const invalid = (message: string) => ctx.addIssue({ code: "custom", message });
    if (value.effectiveUntil && value.effectiveUntil <= value.effectiveFrom) {
      invalid("End date must follow start date (exclusive)");
    }
    const minutes = (v: string) => Number(v.slice(0, 2)) * 60 + Number(v.slice(3));
    const ranges = (windows: z.infer<typeof window>[], offset = 0) =>
      windows.map((w) => {
        const start = minutes(w.startTime),
          end = minutes(w.endTime);
        if (start === end) {
          invalid("Equal times are invalid; split all-day coverage into ranges");
        }
        return [offset + start, offset + end + (end < start ? 1440 : 0)];
      });
    const overlap = (ranges: number[][]) => {
      ranges.sort((a, b) => a[0] - b[0]);
      if (ranges.some((r, i) => i > 0 && r[0] < ranges[i - 1][1])) {
        invalid("Overlapping hours are invalid");
      }
    };
    const weekly = value.weeklyHours.flatMap((w) => ranges([w], w.dayOfWeek * 1440));
    overlap([...weekly, ...weekly.map(([a, b]) => [a + 10080, b + 10080])]);
    if (new Set(value.exceptions.map((e) => e.date)).size !== value.exceptions.length) {
      invalid("Only one exception per date is allowed");
    }
    for (const e of value.exceptions) {
      overlap(ranges(e.windows));
      if (
        e.date < value.effectiveFrom ||
        (value.effectiveUntil && e.date >= value.effectiveUntil)
      ) {
        invalid("Exceptions must fall inside the effective dates");
      }
    }
  });
export const SaveStaffAvailabilitySchema = z
  .object({
    version: z.number().int().nonnegative(),
    profileVersion: z.number().int().positive(),
    pattern: StaffPatternSchema,
  })
  .strict();
export const StaffAvailabilityPlanSchema = z
  .object({
    revision: z.number().int().positive(),
    startsAt: z.string().datetime(),
    endsAt: z.string().datetime().nullable(),
    pattern: StaffPatternSchema,
  })
  .strict();
export const StaffAvailabilitySchema = z
  .object({
    version: z.number().int().nonnegative(),
    plans: z.array(StaffAvailabilityPlanSchema).max(256),
  })
  .strict();
export const StaffCommitmentSchema = z.object({
  id: z.string(),
  kind: z.enum(["booking", "hold"]),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
});
export type StaffPattern = z.infer<typeof StaffPatternSchema>;
export type StaffAvailability = z.infer<typeof StaffAvailabilitySchema>;
export type StaffCommitment = z.infer<typeof StaffCommitmentSchema>;
export const StaffAvailabilityViewSchema = StaffAvailabilitySchema.extend({
  profileVersion: z.number().int().positive(),
  resourceId: z.string().nullable(),
  evaluatedAt: z.string().datetime(),
  affectedCommitments: z.array(StaffCommitmentSchema),
}).strict();
export type StaffAvailabilityView = z.infer<typeof StaffAvailabilityViewSchema>;
