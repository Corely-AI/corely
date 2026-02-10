import type { PortalInviteEmailProps } from "./portal-invite-email.types";

export function buildPortalInviteEmailSubject(props?: Partial<PortalInviteEmailProps>): string {
  return `You're invited to the ${props?.appName ?? "Corely"} Portal`;
}
