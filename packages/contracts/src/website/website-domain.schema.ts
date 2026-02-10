import { z } from "zod";
import { WebsiteDomainSchema } from "./website.types";

export const AddWebsiteDomainInputSchema = z.object({
  hostname: z.string().min(1),
  isPrimary: z.boolean().optional(),
  idempotencyKey: z.string().optional(),
});
export type AddWebsiteDomainInput = z.infer<typeof AddWebsiteDomainInputSchema>;

export const ListWebsiteDomainsOutputSchema = z.object({
  items: z.array(WebsiteDomainSchema),
});
export type ListWebsiteDomainsOutput = z.infer<typeof ListWebsiteDomainsOutputSchema>;
