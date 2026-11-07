import { z } from "zod";
import { ExperienceTargetingSchema } from "./experience-targeting.schema";

export const WorkspacePackageIdSchema = z.literal("internal-operations");
export type WorkspacePackageId = z.infer<typeof WorkspacePackageIdSchema>;

export const OperationalExperienceIdSchema = z.enum(["schedule", "team", "daily-work"]);

/** Metadata on an existing app, never a new app ID or an authorization grant. */
export const OperationalExperienceContributionSchema = ExperienceTargetingSchema.extend({
  experienceId: OperationalExperienceIdSchema,
  route: z.string().regex(/^\/(?!\/)/),
  requiresWorkspaceAdmin: z.boolean().optional(),
  requiredFeatureKey: z.string().optional(),
});
export type OperationalExperienceContribution = z.infer<
  typeof OperationalExperienceContributionSchema
>;

export const OperationalUnavailableReasonSchema = z.enum([
  "not-implemented",
  "app-disabled",
  "dependency-unavailable",
  "workspace-capability-disabled",
  "permission-denied",
  "product-not-entitled",
]);
export type OperationalUnavailableReason = z.infer<typeof OperationalUnavailableReasonSchema>;

export const OperationalExperienceSchema = z.object({
  id: OperationalExperienceIdSchema,
  label: z.string(),
  appId: z.string().optional(),
  availability: z.discriminatedUnion("status", [
    z.object({ status: z.literal("available"), route: z.string() }),
    z.object({
      status: z.literal("unavailable"),
      reason: OperationalUnavailableReasonSchema,
    }),
  ]),
});
export type OperationalExperience = z.infer<typeof OperationalExperienceSchema>;

export const OperationalPackageSchema = z.object({
  packageId: WorkspacePackageIdSchema,
  client: z.literal("openbuk-web"),
  experiences: z.array(OperationalExperienceSchema),
});
export type OperationalPackage = z.infer<typeof OperationalPackageSchema>;
