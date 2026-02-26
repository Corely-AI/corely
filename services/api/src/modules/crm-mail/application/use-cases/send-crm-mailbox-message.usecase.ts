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
import type { SendCrmMailboxMessageInput, SendCrmMailboxMessageOutput } from "@corely/contracts";
import {
  CRM_MAILBOX_REPOSITORY_PORT,
  type CrmMailboxRepositoryPort,
} from "../ports/crm-mailbox-repository.port";
import { CRM_EMAIL_SEND_PORT, type EmailSendPort } from "../ports/email-send.port";

@RequireTenant()
@Injectable()
export class SendCrmMailboxMessageUseCase extends BaseUseCase<
  SendCrmMailboxMessageInput,
  SendCrmMailboxMessageOutput
> {
  constructor(
    @Inject(CRM_MAILBOX_REPOSITORY_PORT)
    private readonly repository: CrmMailboxRepositoryPort,
    @Inject(CRM_EMAIL_SEND_PORT) private readonly sender: EmailSendPort
  ) {
    super({ logger: new NoopLogger() });
  }

  protected async handle(
    input: SendCrmMailboxMessageInput,
    ctx: UseCaseContext
  ): Promise<Result<SendCrmMailboxMessageOutput, UseCaseError>> {
    const mailbox = await this.repository.findMailboxById(ctx.tenantId!, input.mailboxId);
    if (!mailbox) {
      throw new NotFoundError("Mailbox not found", { mailboxId: input.mailboxId });
    }

    const sent = await this.sender.send({
      mailboxId: input.mailboxId,
      connectionId: mailbox.integrationConnectionId,
      tenantId: ctx.tenantId!,
      providerKind: mailbox.providerKind,
      to: input.to,
      cc: input.cc,
      bcc: input.bcc,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });

    const message = await this.repository.createOutgoingMessage({
      tenantId: ctx.tenantId!,
      workspaceId: mailbox.workspaceId,
      mailboxId: mailbox.id,
      externalMessageId: sent.providerMessageId ?? `local:${Date.now()}`,
      subject: input.subject,
      to: input.to.map((email) => ({ email })),
      cc: (input.cc ?? []).map((email) => ({ email })),
      bcc: (input.bcc ?? []).map((email) => ({ email })),
    });

    return ok({ message });
  }
}
