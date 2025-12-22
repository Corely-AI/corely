import { z } from "zod";
import {
  WorkspaceDtoSchema,
  WorkspaceMembershipDtoSchema,
  WorkspaceProfileSchema,
} from "./workspace.types";

export const CreateWorkspaceInputSchema = WorkspaceProfileSchema.extend({
  idempotencyKey: z.string().optional(),
});

export const CreateWorkspaceOutputSchema = z.object({
  workspace: WorkspaceDtoSchema,
  membership: WorkspaceMembershipDtoSchema,
});

export type CreateWorkspaceInput = z.infer<typeof CreateWorkspaceInputSchema>;
export type CreateWorkspaceOutput = z.infer<typeof CreateWorkspaceOutputSchema>;
