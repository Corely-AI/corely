import { z } from "zod";
import {
  OperationalRequestKindSchema,
  OperationalRequestQueueStatusSchema,
} from "../requests/operational-request.schema";

const timestamp = z.string().datetime({ offset: true });
const link = z.string().regex(/^\/(?!\/)/);
const source = <T extends z.ZodTypeAny>(item: T) =>
  z.union([
    z.object({
      status: z.enum(["fresh", "stale", "partial"]),
      observedAt: timestamp,
      total: z.number().int().nonnegative(),
      items: z.array(item),
    }),
    z.object({
      status: z.enum(["disabled", "restricted", "unavailable"]),
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
export type OperationsToday = z.infer<typeof OperationsTodaySchema>;
