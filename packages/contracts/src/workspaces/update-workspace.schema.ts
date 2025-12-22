import { z } from "zod";
import { WorkspaceDtoSchema, WorkspaceProfileSchema } from "./workspace.types";

const WorkspaceUpdatePayloadSchema = WorkspaceProfileSchema.partial();

export const UpdateWorkspaceInputSchema = WorkspaceUpdatePayloadSchema.extend({
  idempotencyKey: z.string().optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: "At least one workspace field must be provided",
});

export const UpdateWorkspaceOutputSchema = z.object({
  workspace: WorkspaceDtoSchema,
});

export type UpdateWorkspaceInput = z.infer<typeof UpdateWorkspaceInputSchema>;
export type UpdateWorkspaceOutput = z.infer<typeof UpdateWorkspaceOutputSchema>;
