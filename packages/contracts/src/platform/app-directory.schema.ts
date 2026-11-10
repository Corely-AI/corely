import { z } from "zod";
import { AppLaunchOriginSchema } from "./app-launch.schema";

export const AppDirectoryCategorySchema = z.enum([
  "finance",
  "people",
  "sales",
  "operations",
  "content",
]);
export const AppDirectoryDescriptorSchema = z.object({
  logo: z
    .object({ iconKey: z.string().min(1), tone: z.enum(["primary", "accent", "muted"]) })
    .optional(),
  menuId: z.string().min(1),
  displayName: z.object({ en: z.string().min(1), de: z.string().min(1), vi: z.string().min(1) }),
  category: AppDirectoryCategorySchema,
});
// Static implemented entry routes only; no parameters, queries or redirect targets.
export const AppDirectoryDestinationSchema = z.object({
  origin: AppLaunchOriginSchema,
  path: z
    .string()
    .regex(/^\/(?!auth(?:\/|$)|sso(?:\/|$)|api(?:\/|$))[a-zA-Z0-9]+(?:[/-][a-zA-Z0-9]+)*$/),
});
export const AppDirectoryEntrySchema = AppDirectoryDescriptorSchema.extend({
  destination: AppDirectoryDestinationSchema.optional(),
});
