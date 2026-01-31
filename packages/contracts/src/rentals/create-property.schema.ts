import { z } from "zod";

export const CreateRentalPropertyInputSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  summary: z.string().optional(),
  descriptionHtml: z.string().optional(),
  maxGuests: z.number().int().positive().optional(),
  categoryIds: z.array(z.string()).optional(),
  coverImageFileId: z.string().optional(),
  images: z
    .array(
      z.object({
        fileId: z.string(),
        altText: z.string().nullish(),
        sortOrder: z.number().optional(),
      })
    )
    .optional(),
});
export type CreateRentalPropertyInput = z.infer<typeof CreateRentalPropertyInputSchema>;
