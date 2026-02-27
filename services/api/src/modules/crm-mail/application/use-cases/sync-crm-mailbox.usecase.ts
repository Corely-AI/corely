import { Inject, Injectable } from "@nestjs/common";
import {
  BaseUseCase,
  NoopLogger,
  NotFoundError,
  RequireTenant,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ok,
} from "@corely/kernel";
import type { SyncCrmMailboxInput, SyncCrmMailboxOutput } from "@corely/contracts";
import {
  CRM_MAILBOX_REPOSITORY_PORT,
  type CrmMailboxRepositoryPort,
} from "../ports/crm-mailbox-repository.port";
import { CRM_EMAIL_INBOX_PORT, type EmailInboxPort } from "../ports/email-inbox.port";

@RequireTenant()
@Injectable()
export class SyncCrmMailboxUseCase extends BaseUseCase<SyncCrmMailboxInput, SyncCrmMailboxOutput> {
  constructor(
    @Inject(CRM_MAILBOX_REPOSITORY_PORT)
    private readonly repository: CrmMailboxRepositoryPort,
    @Inject(CRM_EMAIL_INBOX_PORT) private readonly inbox: EmailInboxPort
  ) {
    super({ logger: new NoopLogger() });
  }

  protected async handle(
    input: SyncCrmMailboxInput,
    ctx: UseCaseContext
  ): Promise<Result<SyncCrmMailboxOutput, UseCaseError>> {
    const mailbox = await this.repository.findMailboxById(ctx.tenantId!, input.mailboxId);
    if (!mailbox) {
      throw new NotFoundError("Mailbox not found", { mailboxId: input.mailboxId });
    }

    const sync = await this.inbox.syncMailbox({
      mailboxId: mailbox.id,
      connectionId: mailbox.integrationConnectionId,
      tenantId: ctx.tenantId!,
      providerKind: mailbox.providerKind,
      cursor: mailbox.syncCursor,
      limit: input.limit,
      since: input.since,
    });

    const persisted = await this.repository.upsertSyncedMessages({
      tenantId: ctx.tenantId!,
      workspaceId: mailbox.workspaceId,
      mailboxId: mailbox.id,
      messages: sync.messages,
      cursor: sync.cursor,
    });

    return ok(persisted);
  }
}
