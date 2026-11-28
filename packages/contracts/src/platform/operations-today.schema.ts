import { z } from "zod";
import {
  OperationalRequestKindSchema,
  OperationalRequestQueueStatusSchema,
} from "../requests/operational-request.schema";

const timestamp = z.string().datetime({ offset: true });
const link = z.string().regex(/^\/(?!\/)/);
const currentStatus = z.enum(["fresh", "stale", "partial"]);
const missingStatus = z.enum(["disabled", "restricted", "unavailable"]);
const source = <T extends z.ZodTypeAny>(item: T) =>
  z.union([
    z.object({
      status: currentStatus,
      observedAt: timestamp,
      total: z.number().int().nonnegative(),
      items: z.array(item),
    }),
    z.object({
      status: missingStatus,
      observedAt: z.null(),
      total: z.null(),
      items: z.tuple([]),
    }),
  ]);
const appointment = z.object({
  id: z.string(),
  status: z.string(),
  startAt: timestamp,
  endAt: timestamp,
  href: link,
});
const task = z.object({
  id: z.string(),
  title: z.string(),
  dueAt: timestamp,
  status: z.enum(["OPEN", "COMPLETED"]),
  href: link,
});
const decision = z.object({
  id: z.string(),
  kind: OperationalRequestKindSchema,
  status: OperationalRequestQueueStatusSchema,
  updatedAt: timestamp,
  href: link,
});
const exception = z.object({ appointmentId: z.string(), startAt: timestamp, href: link });

export const OperationsTodaySchema = z.object({
  workspaceId: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  timezone: z.string(),
  timezoneSource: z.enum(["booking", "utc"]),
  evaluatedAt: timestamp,
  appointments: source(appointment),
  tasks: source(task),
  decisions: source(decision),
  exceptions: source(exception),
});
type TodaySource<T> =
  | { status: z.infer<typeof currentStatus>; observedAt: string; total: number; items: T[] }
  | { status: z.infer<typeof missingStatus>; observedAt: null; total: null; items: [] };

export type OperationsToday = Omit<
  z.infer<typeof OperationsTodaySchema>,
  "appointments" | "tasks" | "decisions" | "exceptions"
> & {
  appointments: TodaySource<z.infer<typeof appointment>>;
  tasks: TodaySource<z.infer<typeof task>>;
  decisions: TodaySource<z.infer<typeof decision>>;
  exceptions: TodaySource<z.infer<typeof exception>>;
};

export const OperationsBriefingSourceSchema = z
  .object({
    kind: z.enum(["appointments", "tasks", "decisions", "exceptions"]),
    status: z.union([currentStatus, missingStatus]),
    observedAt: timestamp.nullable(),
  })
  .strict();
export const OperationsBriefingEntrySchema = z
  .object({
    kind: z.enum(["coverage", "appointment", "task", "decision"]),
    at: timestamp,
    href: link,
  })
  .strict();
const briefingSnapshot = z.object({
  date: OperationsTodaySchema.shape.date,
  timezone: OperationsTodaySchema.shape.timezone,
  checkedAt: timestamp,
  sources: z.array(OperationsBriefingSourceSchema).length(4),
});

export const OperationsBriefingSchema = z.discriminatedUnion("status", [
  briefingSnapshot
    .extend({
      status: z.literal("ready"),
      entries: z.array(OperationsBriefingEntrySchema).min(1).max(5),
    })
    .strict(),
  briefingSnapshot.extend({ status: z.literal("insufficient") }).strict(),
  briefingSnapshot.extend({ status: z.literal("changed") }).strict(),
  z.object({ status: z.literal("unavailable") }).strict(),
]);
export const OperationsBriefingFeedbackSchema = z
  .object({
    outcome: z.enum(["useful", "needs-review"]),
    reviewMs: z.number().int().min(0).max(600_000),
  })
  .strict();
export type OperationsBriefing = z.infer<typeof OperationsBriefingSchema>;
export type OperationsBriefingEntry = z.infer<typeof OperationsBriefingEntrySchema>;
