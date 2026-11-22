import { z } from "zod";

export const CliDayBriefDateSchema = z.union([z.literal("today"), z.string().date()]);
export const CliDayBriefOperation = {
  id: "day.brief",
  description: "Read the workspace appointments, neutral coverage conflicts and outstanding work.",
  inputSchema: {
    type: "object",
    required: ["date"],
    additionalProperties: false,
    properties: { date: { anyOf: [{ const: "today" }, { type: "string", format: "date" }] } },
  },
} as const;

function source<T extends z.ZodTypeAny>(item: T) {
  return z
    .object({
      status: z.enum(["fresh", "stale", "unavailable", "disabled", "restricted"]),
      observedAt: z.string().datetime().nullable(),
      total: z.number().int().nonnegative().nullable(),
      items: z.array(item),
    })
    .strict();
}

export const CliDayBriefSchema = z
  .object({
    workspaceId: z.string(),
    workspaceName: z.string(),
    date: z.string().date(),
    timezone: z.string(),
    timezoneSource: z.enum(["openbuk", "utc-default"]),
    appointments: source(
      z
        .object({
          id: z.string(),
          startAt: z.string().datetime(),
          endAt: z.string().datetime(),
          status: z.string(),
          sourcePath: z.literal("/openbuk/app"),
        })
        .strict()
    ),
    coverage: source(
      z
        .object({
          appointmentId: z.string(),
          startAt: z.string().datetime(),
          sourcePath: z.literal("/openbuk/app"),
        })
        .strict()
    ),
    tasks: source(
      z
        .object({
          id: z.string(),
          title: z.string(),
          dueAt: z.string().datetime().nullable(),
          checklist: z.object({ done: z.number().int(), total: z.number().int() }).nullable(),
          sourcePath: z.literal("/openbuk/app/tasks"),
        })
        .strict()
    ),
  })
  .strict();

export type CliDayBrief = z.infer<typeof CliDayBriefSchema>;
