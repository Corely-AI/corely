import { z } from "zod";
import {
  WorkspaceInviteDtoSchema,
  WorkspaceMemberSchema,
  WorkspaceMembershipRoleSchema,
  WorkspaceMembershipStatusSchema,
} from "./workspace.types";

export const ListWorkspaceMembersOutputSchema = z.object({
  members: z.array(WorkspaceMemberSchema),
  invites: z.array(WorkspaceInviteDtoSchema).optional(),
});

export const UpdateWorkspaceMemberInputSchema = z
  .object({
    role: WorkspaceMembershipRoleSchema.optional(),
    status: WorkspaceMembershipStatusSchema.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: "role or status must be provided" });

export const UpdateWorkspaceMemberOutputSchema = z.object({
  member: WorkspaceMemberSchema,
});

export const RemoveWorkspaceMemberOutputSchema = z.object({
  memberId: z.string(),
  removed: z.boolean().default(true),
});

export type ListWorkspaceMembersOutput = z.infer<typeof ListWorkspaceMembersOutputSchema>;
export type UpdateWorkspaceMemberInput = z.infer<typeof UpdateWorkspaceMemberInputSchema>;
export type UpdateWorkspaceMemberOutput = z.infer<typeof UpdateWorkspaceMemberOutputSchema>;
export type RemoveWorkspaceMemberOutput = z.infer<typeof RemoveWorkspaceMemberOutputSchema>;
