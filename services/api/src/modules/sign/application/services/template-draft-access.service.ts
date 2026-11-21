import { Injectable, NotFoundException } from "@nestjs/common";
import { SignTemplateIdSchema } from "@corely/contracts";
import { type UseCaseContext } from "@corely/kernel";
import { SignAccessService } from "./sign-access.service";
import { SignDraftRepository } from "../ports/sign-draft.repository";

@Injectable()
export class TemplateDraftAccessService {
  constructor(
    private readonly drafts: SignDraftRepository,
    private readonly access: SignAccessService
  ) {}

  async requireDraft(ctx: UseCaseContext, id: string) {
    const { scope } = await this.access.authorize(ctx);
    const draft = await this.drafts.latest(scope, SignTemplateIdSchema.parse(id));
    if (!draft) {
      throw new NotFoundException("Template draft not found");
    }
    return { scope, draft };
  }

  async sourceOwner(ctx: UseCaseContext, id: string) {
    const { draft, scope } = await this.requireDraft(ctx, id);
    return {
      ...scope,
      templateId: draft.templateId.toLowerCase(),
      archived: draft.archived,
      sha256: draft.layout.document.sha256,
      pageCount: draft.layout.document.pageCount,
    };
  }
}
