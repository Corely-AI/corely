export type PasswordResetEmailRequest = {
  tenantId: string;
  to: string;
  resetUrl: string;
  correlationId?: string;
  idempotencyKey?: string;
};

export interface PasswordResetEmailPort {
  send(request: PasswordResetEmailRequest): Promise<void>;
}

export const PASSWORD_RESET_EMAIL_PORT = "identity/password-reset-email";
