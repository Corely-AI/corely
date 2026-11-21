import { Injectable, Inject, BadRequestException, ConflictException } from "@nestjs/common";
import { createHash, randomUUID } from "node:crypto";
import { CreateSignRequestDraftSchema, SignTemplateIdSchema } from "@corely/contracts";
import {
  UNIT_OF_WORK,
  AUDIT_PORT,
  OUTBOX_PORT,
  type TransactionContext,
  type UseCaseContext,
  type UnitOfWorkPort,
  type AuditPort,
  type OutboxPort,
} from "@corely/kernel";
import { SignAccessService } from "../services/sign-access.service";
import { SignDraftRepository } from "../ports/sign-draft.repository";
import { RequestDraftRepository } from "../ports/request-draft.repository";
import { recipientsMatchRoles } from "../../domain/recipient-roles";

@Injectable()
export class CreateSignRequestDraftUseCase {
  constructor(
    private readonly access: SignAccessService,
    private readonly templates: SignDraftRepository,
    private readonly requests: RequestDraftRepository,
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWorkPort,
    @Inject(AUDIT_PORT) private readonly audit: AuditPort,
    @Inject(OUTBOX_PORT) private readonly outbox: OutboxPort
  ) {}

  async execute(
    ctx: UseCaseContext,
    body: unknown,
    key: string | undefined,
    transaction?: TransactionContext
  ) {
    if (!key || !SignTemplateIdSchema.safeParse(key).success) {
      throw new BadRequestException("UUID idempotency key required");
    }
    const commandId = key.toLowerCase();
    const input = CreateSignRequestDraftSchema.parse(body);
    input.templateId = input.templateId.toLowerCase();
    const fingerprint = createHash("sha256").update(JSON.stringify(input)).digest("hex");
    const write = async (tx: TransactionContext) => {
      const { scope, userId } = await this.access.authorize(ctx, tx, [
        "sign.templates.manage",
        "sign.requests.create",
        "sign.requests.read",
      ]);
      const owner = { ...scope, actorId: userId };
      await this.requests.lock(owner, commandId, tx);
      const prior = await this.requests.replay(owner, commandId, tx);
      if (prior) {
        if (prior.fingerprint !== fingerprint) {
          throw new ConflictException(
            "Request key used with a different recipient list or template."
          );
        }
        return prior.draft;
      }
      await this.templates.lock(scope, input.templateId, tx);
      const latest = await this.templates.latest(scope, input.templateId, tx);
      if (
        !latest ||
        latest.archived ||
        !(await this.templates.publication(scope, input.templateId, input.templateRevision, tx))
      ) {
        throw new ConflictException("Choose a published version of an active template.");
      }
      const version = await this.templates.version(
        scope,
        input.templateId,
        input.templateRevision,
        tx
      );
      if (!version || !recipientsMatchRoles(version.layout, input)) {
        throw new BadRequestException("Assign exactly one recipient to every published role.");
      }
      const draft = await this.requests.create(
        owner,
        randomUUID(),
        commandId,
        fingerprint,
        input,
        tx
      );
      const action = "sign.request.draft_created.v1";
      const metadata = {
        workspaceId: scope.workspaceId,
        requestId: draft.requestId,
        templateId: input.templateId,
        revision: input.templateRevision,
      };
      await this.audit.log(
        {
          tenantId: scope.tenantId,
          userId,
          entityType: "SignRequest",
          entityId: draft.requestId,
          action,
          metadata,
        },
        tx
      );
      await this.outbox.enqueue(
        {
          tenantId: scope.tenantId,
          eventType: action,
          payload: metadata,
          correlationId: ctx.correlationId,
        },
        tx
      );
      return draft;
    };
    return transaction ? write(transaction) : this.uow.withinTransaction(write);
  }
}
