import { Module } from "@nestjs/common";
import { EnvService } from "@corely/config";
import { EMAIL_SENDER_PORT } from "@corely/kernel";
import { ResendEmailSenderAdapter } from "@corely/email";

import { NotificationIntentHandler } from "./handlers/notification-intent.handler";
import { NotificationEmitterService } from "./services/notification-emitter.service";

@Module({
  providers: [
    NotificationIntentHandler,
    NotificationEmitterService,
    {
      provide: EMAIL_SENDER_PORT,
      useFactory: (env: EnvService) => {
        const provider = env.EMAIL_PROVIDER;
        if (provider !== "resend") {
          throw new Error(`Unsupported email provider: ${provider}`);
        }
        return new ResendEmailSenderAdapter({
          apiKey: env.RESEND_API_KEY,
          fromAddress: env.RESEND_FROM,
          replyTo: env.RESEND_REPLY_TO,
        });
      },
      inject: [EnvService],
    },
  ],
  exports: [EMAIL_SENDER_PORT, NotificationIntentHandler, NotificationEmitterService],
})
export class NotificationsModule {}
