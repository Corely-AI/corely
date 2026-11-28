export interface SsoEmailPort {
  sendCode(input: {
    to: string;
    code: string;
    expiryMinutes: number;
    idempotencyKey: string;
  }): Promise<void>;
}
export const SSO_EMAIL = "identity/sso-email";
