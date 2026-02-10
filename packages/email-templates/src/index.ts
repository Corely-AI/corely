export { renderEmail } from "./render";
export type { RenderEmailResult } from "./render";

// Re-export invoices module
export { InvoiceEmail, buildInvoiceEmailSubject } from "./invoices/index";
export type { InvoiceEmailProps } from "./invoices/index";

// Re-export password reset module
export { PasswordResetEmail, buildPasswordResetEmailSubject } from "./password-reset/index";
export type { PasswordResetEmailProps } from "./password-reset/index";

// Re-export leads module
export { LeadConfirmationEmail, buildLeadConfirmationEmailSubject } from "./leads/index";

// Re-export portal OTP module
export { PortalOtpEmail, buildPortalOtpEmailSubject } from "./portal-otp/index";
export type { PortalOtpEmailProps } from "./portal-otp/index";

// Re-export portal invite module
export { PortalInviteEmail, buildPortalInviteEmailSubject } from "./portal-invite/index";
export type { PortalInviteEmailProps } from "./portal-invite/index";
