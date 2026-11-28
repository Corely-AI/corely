import { requestLayout } from "../services/request-layout";
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
    const { owner, layout, draftRevision } = await this.uow.withinTransaction(async (tx) => {
      const { ref, draft } = await this.requestAccess.requireOwner(
        ctx,
        id,
        "sign.requests.read",
        tx
      );
      const scope = { tenantId: ref.tenantId, workspaceId: ref.workspaceId };
      const layout = await requestLayout(this.templates, scope, draft, tx);
      return {
        layout,
        draftRevision: draft.configuration?.revision ?? 0,
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
    return {
      base64: pdf.toString("base64"),
      sha256: owner.sha256,
      fields: layout?.fields,
      layout,
      draftRevision,
    };
  }
}
