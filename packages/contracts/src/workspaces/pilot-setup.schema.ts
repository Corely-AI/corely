import { z } from "zod";
import {
  AcceptWorkspaceInviteInputSchema,
  AcceptWorkspaceInviteOutputSchema,
} from "./workspace-invites.schema";

// Pilot setup grants workspace membership only; privileged roles use existing role management.
export const CreatePilotInviteInputSchema = z
  .object({
    email: z
      .string()
      .trim()
      .email()
      .transform((value) => value.toLowerCase()),
  })
  .strict();
export const StartPilotWorkspaceInputSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    countryCode: z.string().regex(/^[A-Z]{2}$/),
    currency: z.string().regex(/^[A-Z]{3}$/),
  })
  .strict();
export type StartPilotWorkspaceInput = z.infer<typeof StartPilotWorkspaceInputSchema>;

export const AcceptPilotWorkspaceInviteInputSchema = AcceptWorkspaceInviteInputSchema.extend({
  token: z.string().regex(/^[a-f0-9]{64}$/),
}).strict();
export const AcceptPilotWorkspaceInviteOutputSchema = AcceptWorkspaceInviteOutputSchema.extend({
  tenantId: z.string(),
});
export type AcceptPilotWorkspaceInviteOutput = z.infer<
  typeof AcceptPilotWorkspaceInviteOutputSchema
>;
