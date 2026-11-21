import { hasRequiredSignatures } from "../../domain/template-revision";
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  PublishSignTemplateSchema,
  SignTemplateIdSchema,
  type SignPublication,
} from "@corely/contracts";
import {
  UNIT_OF_WORK,
  AUDIT_PORT,
  OUTBOX_PORT,
  type UnitOfWorkPort,
  type AuditPort,
  type OutboxPort,
  type UseCaseContext,
} from "@corely/kernel";
import { TemplateDocuments } from "../../../documents/public";
import { SignDraftRepository } from "../ports/sign-draft.repository";
import { TemplatePdfInspector } from "../ports/template-pdf-inspector";
import { SignAccessService } from "../services/sign-access.service";

@Injectable()
export class PublishSignTemplateUseCase {
  constructor(
    private readonly access: SignAccessService,
    private readonly repo: SignDraftRepository,
    private readonly documents: TemplateDocuments,
    private readonly inspector: TemplatePdfInspector,
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWorkPort,
    @Inject(AUDIT_PORT) private readonly audit: AuditPort,
    @Inject(OUTBOX_PORT) private readonly outbox: OutboxPort
  ) {}

  async execute(ctx: UseCaseContext, id: string, input: unknown) {
    const templateId = SignTemplateIdSchema.parse(id).toLowerCase();
    const { revision } = PublishSignTemplateSchema.parse(input);
    const { scope } = await this.access.authorize(ctx);
    const already = await this.repo.publication(scope, templateId, revision);
    if (already) {
      return already;
    }
    const draft = await this.repo.latest(scope, templateId);
    if (!draft) {
      throw new NotFoundException("Template draft not found");
    }
    if (draft.archived) {
      throw new ConflictException("Template is archived.");
    }
    if (draft.revision !== revision) {
      throw new ConflictException("Reload the current template before publishing.");
    }
    if (!hasRequiredSignatures(draft.layout)) {
      throw new BadRequestException("Place a required signature for each signer role.");
    }
    const sha256 = draft.layout.document.sha256;
    const bytes = await this.documents.read({ ...scope, templateId, sha256 });
    if (!bytes) {
      throw new ConflictException("Save the original PDF before publishing.");
    }
    let pages: number;
    try {
      pages = await this.inspector.pageCount(bytes);
    } catch {
      throw new BadRequestException("This PDF is unsupported for publication.");
    }
    if (pages !== draft.layout.document.pageCount) {
      throw new ConflictException("PDF page count mismatch.");
    }
    return this.uow.withinTransaction(async (tx) => {
      const { userId } = await this.access.authorize(ctx, tx);
      await this.repo.lock(scope, templateId, tx);
      const prior = await this.repo.publication(scope, templateId, revision, tx);
      if (prior) {
        return prior;
      }
      if ((await this.repo.latest(scope, templateId, tx))?.revision !== revision) {
        throw new ConflictException("The template changed during publication.");
      }
      const result: SignPublication = {
        templateId,
        revision,
        originalSha256: sha256,
        canonicalSha256: sha256,
        profile: "static-pdf-v1",
      };
      await this.repo.publish(scope, result, userId, tx);
      const action = "sign.template.published.v1";
      const metadata = { workspaceId: scope.workspaceId, templateId, revision };
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
