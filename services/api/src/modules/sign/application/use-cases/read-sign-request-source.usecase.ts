import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { UNIT_OF_WORK, type UnitOfWorkPort, type UseCaseContext } from "@corely/kernel";
import { TemplateDocuments } from "../../../documents/public";
import { SignRequestAccessService } from "../services/sign-request-access.service";
import { SignDraftRepository } from "../ports/sign-draft.repository";

@Injectable()
export class ReadSignRequestSourceUseCase {
  constructor(
    private readonly documents: TemplateDocuments,
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWorkPort,
    private readonly requestAccess: SignRequestAccessService,
    private readonly templates: SignDraftRepository
  ) {}

  async execute(ctx: UseCaseContext, id: string) {
    const { owner, fields } = await this.uow.withinTransaction(async (tx) => {
      const { ref, draft } = await this.requestAccess.requireOwner(
        ctx,
        id,
        "sign.requests.read",
        tx
      );
      const scope = { tenantId: ref.tenantId, workspaceId: ref.workspaceId };
      const version = await this.templates.version(
        scope,
        draft.templateId,
        draft.templateRevision,
        tx
      );
      return {
        fields: version?.layout.fields,
        owner: {
          tenantId: ref.tenantId,
          workspaceId: ref.workspaceId,
          templateId: draft.templateId,
          sha256: draft.canonicalSha256,
        },
      };
    });
    const pdf = await this.documents.read(owner);
    if (!pdf) {
      throw new NotFoundException("Source unavailable");
    }
    return { base64: pdf.toString("base64"), sha256: owner.sha256, fields };
  }
}
