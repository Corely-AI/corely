import { z } from "zod";

export const DeleteWorkspaceInputSchema = z.object({
  idempotencyKey: z.string().optional(),
});

export const DeleteWorkspaceOutputSchema = z.object({
  success: z.boolean(),
});

export type DeleteWorkspaceInput = z.infer<typeof DeleteWorkspaceInputSchema>;
export type DeleteWorkspaceOutput = z.infer<typeof DeleteWorkspaceOutputSchema>;
