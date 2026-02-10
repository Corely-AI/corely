import type { PortalOtpEmailProps } from "./portal-otp-email.types";

export function buildPortalOtpEmailSubject(_props?: Partial<PortalOtpEmailProps>): string {
  return "Your login code";
}
