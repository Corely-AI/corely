import { Module } from "@nestjs/common";
import { DataModule } from "@corely/data";
import { KernelModule } from "../../shared/kernel/kernel.module";
import { IdentityModule } from "../identity";
import { IntegrationsModule } from "../integrations";
import { CrmMailboxesController } from "./adapters/http/crm-mailboxes.controller";
import { CrmMailApplication } from "./application/crm-mail.application";
import { CreateCrmMailboxUseCase } from "./application/use-cases/create-crm-mailbox.usecase";
import { SendCrmMailboxMessageUseCase } from "./application/use-cases/send-crm-mailbox-message.usecase";
import { SyncCrmMailboxUseCase } from "./application/use-cases/sync-crm-mailbox.usecase";
import { CRM_MAILBOX_REPOSITORY_PORT } from "./application/ports/crm-mailbox-repository.port";
import { CRM_EMAIL_INBOX_PORT } from "./application/ports/email-inbox.port";
import { CRM_EMAIL_SEND_PORT } from "./application/ports/email-send.port";
import { PrismaCrmMailboxRepositoryAdapter } from "./infrastructure/prisma/prisma-crm-mailbox-repository.adapter";
import { IntegrationsEmailAdapter } from "./infrastructure/adapters/integrations-email.adapter";

@Module({
  imports: [DataModule, KernelModule, IdentityModule, IntegrationsModule],
  controllers: [CrmMailboxesController],
  providers: [
    PrismaCrmMailboxRepositoryAdapter,
    IntegrationsEmailAdapter,
    {
      provide: CRM_MAILBOX_REPOSITORY_PORT,
      useExisting: PrismaCrmMailboxRepositoryAdapter,
    },
    {
      provide: CRM_EMAIL_SEND_PORT,
      useExisting: IntegrationsEmailAdapter,
    },
    {
      provide: CRM_EMAIL_INBOX_PORT,
      useExisting: IntegrationsEmailAdapter,
    },
    CreateCrmMailboxUseCase,
    SendCrmMailboxMessageUseCase,
    SyncCrmMailboxUseCase,
    {
      provide: CrmMailApplication,
      useFactory: (
        createMailbox: CreateCrmMailboxUseCase,
        sendMessage: SendCrmMailboxMessageUseCase,
        syncMailbox: SyncCrmMailboxUseCase
      ) => new CrmMailApplication(createMailbox, sendMessage, syncMailbox),
      inject: [CreateCrmMailboxUseCase, SendCrmMailboxMessageUseCase, SyncCrmMailboxUseCase],
    },
  ],
  exports: [CrmMailApplication],
})
export class CrmMailModule {}
