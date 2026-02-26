import type { CreateCrmMailboxUseCase } from "./use-cases/create-crm-mailbox.usecase";
import type { SendCrmMailboxMessageUseCase } from "./use-cases/send-crm-mailbox-message.usecase";
import type { SyncCrmMailboxUseCase } from "./use-cases/sync-crm-mailbox.usecase";

export class CrmMailApplication {
  constructor(
    public readonly createMailbox: CreateCrmMailboxUseCase,
    public readonly sendMessage: SendCrmMailboxMessageUseCase,
    public readonly syncMailbox: SyncCrmMailboxUseCase
  ) {}
}
