export interface PortalOtpEmailRequest {
  to: string;
  code: string;
  expiryMinutes: number;
  idempotencyKey?: string;
}

export interface PortalInviteEmailRequest {
  to: string;
  portalUrl: string;
  studentName?: string;
}

export interface PortalEmailPort {
  sendOtpCode(request: PortalOtpEmailRequest): Promise<void>;
  sendInvite(request: PortalInviteEmailRequest): Promise<void>;
}

export const PORTAL_EMAIL_PORT = "portal/email-port";
