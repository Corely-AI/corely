import { z } from "zod";

export const PasswordResetRequestInputSchema = z.object({
  email: z.string().email(),
});
export type PasswordResetRequestInput = z.infer<typeof PasswordResetRequestInputSchema>;

export const PasswordResetRequestResponseSchema = z.object({
  ok: z.literal(true),
});
export type PasswordResetRequestResponse = z.infer<typeof PasswordResetRequestResponseSchema>;

export const PasswordResetConfirmInputSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(6),
});
export type PasswordResetConfirmInput = z.infer<typeof PasswordResetConfirmInputSchema>;

export const PasswordResetConfirmResponseSchema = z.object({
  ok: z.literal(true),
});
export type PasswordResetConfirmResponse = z.infer<typeof PasswordResetConfirmResponseSchema>;
