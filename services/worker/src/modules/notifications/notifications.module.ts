import { Module } from "@nestjs/common";
import { EnvService } from "@corely/config";
import { EMAIL_SENDER_PORT } from "./ports/email-sender.port";
import { ResendEmailSenderAdapter } from "./infrastructure/resend/resend-email-sender.adapter";

@Module({
  providers: [
    {
      provide: EMAIL_SENDER_PORT,
      useFactory: (env: EnvService) => {
        const provider = env.EMAIL_PROVIDER;
        if (provider !== "resend") {
          throw new Error(`Unsupported email provider: ${provider}`);
        }
        return new ResendEmailSenderAdapter(
          env.RESEND_API_KEY,
          env.RESEND_FROM,
          env.RESEND_REPLY_TO
        );
      },
      inject: [EnvService],
    },
  ],
  exports: [EMAIL_SENDER_PORT],
})
export class NotificationsModule {}
