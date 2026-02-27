import { z } from "zod";
import { localDateSchema } from "../shared/local-date.schema";

export const UpcomingBirthdaySchema = z.object({
  customerPartyId: z.string().uuid(),
  displayName: z.string(),
  birthday: localDateSchema,
  nextBirthday: localDateSchema,
  daysUntilBirthday: z.number().int().nonnegative(),
});

export const ListUpcomingBirthdaysInputSchema = z.object({
  from: localDateSchema.optional(),
  to: localDateSchema.optional(),
  pageSize: z.number().int().positive().max(200).optional(),
  cursor: z.string().optional(),
});

export const ListUpcomingBirthdaysOutputSchema = z.object({
  items: z.array(UpcomingBirthdaySchema),
  nextCursor: z.string().nullable().optional(),
});

export type UpcomingBirthday = z.infer<typeof UpcomingBirthdaySchema>;
export type ListUpcomingBirthdaysInput = z.infer<typeof ListUpcomingBirthdaysInputSchema>;
export type ListUpcomingBirthdaysOutput = z.infer<typeof ListUpcomingBirthdaysOutputSchema>;
