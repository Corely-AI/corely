import { ForbiddenException, Inject, Injectable } from "@nestjs/common";
import {
  AUDIT_PORT,
  OUTBOX_PORT,
  type AuditPort,
  type OutboxPort,
  type TransactionContext,
} from "@corely/kernel";
import { USER_REPOSITORY_TOKEN, type UserRepositoryPort } from "../ports/user-repository.port";
import { INVITED_ACCOUNT_PORT, type InvitedAccountPort } from "../ports/invited-account.port";

/** Public Identity interface, called only after Workspaces validates a recipient's invitation. */
@Injectable()
export class AssociateInvitedAccountUseCase {
  constructor(
    @Inject(USER_REPOSITORY_TOKEN) private readonly users: UserRepositoryPort,
    @Inject(INVITED_ACCOUNT_PORT) private readonly accounts: InvitedAccountPort,
    @Inject(AUDIT_PORT) private readonly audit: AuditPort,
    @Inject(OUTBOX_PORT) private readonly outbox: OutboxPort
  ) {}
  async execute(
    input: { tenantId: string; userId: string; email: string; allowCreate: boolean },
    tx: TransactionContext
  ) {
    const user = await this.users.findById(input.userId, tx);
    if (
      !user?.isActive() ||
      user.getEmail().getValue().toLowerCase() !== input.email.toLowerCase()
    ) {
      throw new ForbiddenException("Sign in with the invited email address");
    }
    if (
      await this.accounts.ensureTenantMember(input.tenantId, input.userId, tx, input.allowCreate)
    ) {
      await this.audit.log(
        {
          tenantId: input.tenantId,
          userId: input.userId,
          action: "identity.invited-account.associated",
          entityType: "User",
          entityId: input.userId,
        },
        tx
      );
      await this.outbox.enqueue(
        {
          tenantId: input.tenantId,
          eventType: "identity.invited-account.associated",
          payload: { userId: input.userId },
        },
        tx
      );
    }
  }
}
