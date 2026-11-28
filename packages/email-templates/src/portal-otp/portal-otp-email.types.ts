export type PortalOtpEmailProps = {
  code: string;
  expiryMinutes: number;
  appName?: string;
  audience?: "portal" | "account";
};
