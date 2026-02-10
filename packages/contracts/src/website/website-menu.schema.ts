import { z } from "zod";
import { WebsiteMenuSchema } from "./website.types";

export const UpsertWebsiteMenuInputSchema = z.object({
  siteId: z.string(),
  name: z.string().min(1),
  locale: z.string().min(2),
  itemsJson: z.unknown(),
  idempotencyKey: z.string().optional(),
});
export type UpsertWebsiteMenuInput = z.infer<typeof UpsertWebsiteMenuInputSchema>;

export const UpsertWebsiteMenuOutputSchema = z.object({
  menu: WebsiteMenuSchema,
});
export type UpsertWebsiteMenuOutput = z.infer<typeof UpsertWebsiteMenuOutputSchema>;

export const ListWebsiteMenusOutputSchema = z.object({
  items: z.array(WebsiteMenuSchema),
});
export type ListWebsiteMenusOutput = z.infer<typeof ListWebsiteMenusOutputSchema>;
