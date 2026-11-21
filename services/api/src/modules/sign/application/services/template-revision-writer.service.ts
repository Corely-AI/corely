import { Injectable, Inject, BadRequestException, ConflictException } from "@nestjs/common";
import { hash } from "../../domain/digest";
import { nextTemplateRevision } from "../../domain/template-revision";
import { SignTemplateIdSchema, type SaveSignDraftSchema, type SignDraft } from "@corely/contracts";
import {
  UNIT_OF_WORK,
  AUDIT_PORT,
  OUTBOX_PORT,
  type AuditPort,
  type OutboxPort,
  type UseCaseContext,
  type UnitOfWorkPort,
} from "@corely/kernel";
import { SignAccessService } from "./sign-access.service";
import { SignDraftRepository } from "../ports/sign-draft.repository";

type TemplateChange =
  | { kind: "save"; draft: ReturnType<typeof SaveSignDraftSchema.parse> }
  | { kind: "archive"; revision: number };

export function templateRevisionCommand(id: string, key: string | undefined) {
  const templateId = SignTemplateIdSchema.parse(id).toLowerCase();
  if (!key || !SignTemplateIdSchema.safeParse(key).success) {
    throw new BadRequestException("UUID idempotency key required");
  }
  return { templateId, key };
}

@Injectable()
export class TemplateRevisionWriter {
  constructor(
    private readonly drafts: SignDraftRepository,
    private readonly access: SignAccessService,
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWorkPort,
    @Inject(AUDIT_PORT) private readonly audit: AuditPort,
    @Inject(OUTBOX_PORT) private readonly outbox: OutboxPort
  ) {}

  async write(
    ctx: UseCaseContext,
    command: ReturnType<typeof templateRevisionCommand>,
    change: TemplateChange
  ): Promise<SignDraft> {
    const { templateId, key } = command;
    const input = change.kind === "save" ? change.draft : null;
    const expectedRevision =
      change.kind === "save" ? change.draft.expectedRevision : change.revision;
    const fingerprint = hash(JSON.stringify([change.kind, input, expectedRevision]));
    return this.uow.withinTransaction(async (tx) => {
      const { scope, userId } = await this.access.authorize(ctx, tx);
      await this.drafts.lock(scope, templateId, tx);
      const prior = await this.drafts.replay(scope, templateId, userId, key, tx);
      if (prior) {
        if (prior.fingerprint !== fingerprint) {
          throw new ConflictException("Idempotency key already used for different changes");
        }
        return {
          templateId,
          archived: prior.archived,
          title: prior.title,
          revision: prior.revision,
          layout: prior.layout,
        };
      }
      const previous = await this.drafts.latest(scope, templateId, tx);
      const next = nextTemplateRevision(templateId, previous, expectedRevision, input);
      if ("conflict" in next) {
        throw new ConflictException(next.conflict);
      }
      const result = next.draft;
      await this.drafts.append(
        scope,
        { ...result, commandId: key, actorId: userId, fingerprint },
        tx
      );
      const action =
        change.kind === "archive" ? "sign.template.archived.v1" : "sign.template.draft_saved.v1";
      const metadata = { workspaceId: scope.workspaceId, templateId, revision: result.revision };
      await this.audit.log(
        {
          tenantId: scope.tenantId,
          userId,
          action,
          entityType: "SignTemplate",
          entityId: templateId,
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
      return result;
    });
  }
}
