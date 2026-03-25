import { z } from "zod";
import { AllowedSurfacesSchema } from "./surface.schema";

export const PosVerticalIdSchema = z.enum(["restaurant", "nails", "retail"]);

export type PosVerticalId = z.infer<typeof PosVerticalIdSchema>;

export const AllowedVerticalsSchema = z.array(PosVerticalIdSchema);

export const ExperienceTargetingSchema = z.object({
  allowedSurfaces: AllowedSurfacesSchema.optional(),
  allowedVerticals: AllowedVerticalsSchema.optional(),
  requiredCapabilities: z.array(z.string()).optional(),
  requiredPermissions: z.array(z.string()).optional(),
});

export type ExperienceTargeting = z.infer<typeof ExperienceTargetingSchema>;
