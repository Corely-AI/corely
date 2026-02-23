import { z } from "zod";

export const CreateDirectoryLeadRequestSchema = z
  .object({
    restaurantId: z.string().min(1).optional(),
    restaurantSlug: z.string().min(1).optional(),
    name: z.string().trim().min(1).max(200),
    contact: z.string().trim().min(1).max(200),
    message: z.string().trim().min(1).max(4000),
  })
  .superRefine((input, ctx) => {
    if (!input.restaurantId && !input.restaurantSlug) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Either restaurantId or restaurantSlug is required",
        path: ["restaurantId"],
      });
    }
  });
export type CreateDirectoryLeadRequest = z.infer<typeof CreateDirectoryLeadRequestSchema>;

export const CreateDirectoryLeadResponseSchema = z.object({
  leadId: z.string(),
});
export type CreateDirectoryLeadResponse = z.infer<typeof CreateDirectoryLeadResponseSchema>;
