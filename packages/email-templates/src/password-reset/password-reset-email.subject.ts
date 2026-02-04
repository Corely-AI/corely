import type { PasswordResetEmailProps } from "./password-reset-email.types";

export function buildPasswordResetEmailSubject(props: PasswordResetEmailProps): string {
  const appName = props.appName ?? "Corely";
  return `Reset your ${appName} password`;
}
