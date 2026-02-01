import { z } from "zod";
import { utcInstantSchema } from "../shared/local-date.schema";

export const WorkspaceDomainDtoSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  domain: z.string(),
  isPrimary: z.boolean(),
  createdAt: utcInstantSchema,
});
export type WorkspaceDomainDto = z.infer<typeof WorkspaceDomainDtoSchema>;

export const CreateWorkspaceDomainInputSchema = z.object({
  domain: z.string().min(1),
  idempotencyKey: z.string().optional(),
});
export type CreateWorkspaceDomainInput = z.infer<typeof CreateWorkspaceDomainInputSchema>;

export const CreateWorkspaceDomainOutputSchema = z.object({
  domain: WorkspaceDomainDtoSchema,
});
export type CreateWorkspaceDomainOutput = z.infer<typeof CreateWorkspaceDomainOutputSchema>;

export const SetPrimaryWorkspaceDomainInputSchema = z.object({
  isPrimary: z.boolean().optional().default(true),
});
export type SetPrimaryWorkspaceDomainInput = z.infer<typeof SetPrimaryWorkspaceDomainInputSchema>;

export const SetPrimaryWorkspaceDomainOutputSchema = z.object({
  domain: WorkspaceDomainDtoSchema,
});
export type SetPrimaryWorkspaceDomainOutput = z.infer<typeof SetPrimaryWorkspaceDomainOutputSchema>;

export const DeleteWorkspaceDomainOutputSchema = z.object({
  success: z.boolean(),
});
export type DeleteWorkspaceDomainOutput = z.infer<typeof DeleteWorkspaceDomainOutputSchema>;
