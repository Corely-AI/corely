import type {
  PasswordResetEmailPort,
  PasswordResetEmailRequest,
} from "../../application/ports/password-reset-email.port";

export class FakePasswordResetEmailSender implements PasswordResetEmailPort {
  sent: PasswordResetEmailRequest[] = [];

  async send(request: PasswordResetEmailRequest): Promise<void> {
    this.sent.push(request);
  }
}
