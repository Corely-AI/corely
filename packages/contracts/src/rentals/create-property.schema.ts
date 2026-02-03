import { z } from "zod";
import { CurrencyCodeSchema } from "../money/currency.schema";

export const CreateRentalPropertyInputSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  summary: z.string().optional(),
  descriptionHtml: z.string().optional(),
  checkIn: z.string().nullish(),
  checkOut: z.string().nullish(),
  offers: z.array(z.string()).optional(),
  maxGuests: z.number().int().positive().optional(),
  categoryIds: z.array(z.string()).optional(),
  coverImageFileId: z.string().optional(),
  price: z.number().optional(),
  currency: CurrencyCodeSchema.optional(),
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
