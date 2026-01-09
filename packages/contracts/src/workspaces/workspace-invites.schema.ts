import { z } from "zod";
import { WorkspaceInviteDtoSchema, WorkspaceMembershipRoleSchema } from "./workspace.types";

export const CreateWorkspaceInviteInputSchema = z.object({
  email: z.string().email(),
  role: WorkspaceMembershipRoleSchema.default("MEMBER"),
  message: z.string().optional(),
});

export const CreateWorkspaceInviteOutputSchema = z.object({
  invite: WorkspaceInviteDtoSchema,
});

export const AcceptWorkspaceInviteInputSchema = z.object({
  token: z.string(),
});

export const AcceptWorkspaceInviteOutputSchema = z.object({
  workspaceId: z.string(),
  membershipId: z.string(),
});

export type CreateWorkspaceInviteInput = z.infer<typeof CreateWorkspaceInviteInputSchema>;
export type CreateWorkspaceInviteOutput = z.infer<typeof CreateWorkspaceInviteOutputSchema>;
export type AcceptWorkspaceInviteInput = z.infer<typeof AcceptWorkspaceInviteInputSchema>;
export type AcceptWorkspaceInviteOutput = z.infer<typeof AcceptWorkspaceInviteOutputSchema>;
