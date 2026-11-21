import { Injectable } from "@nestjs/common";
import { SignTemplateIdSchema } from "@corely/contracts";
import { type UseCaseContext } from "@corely/kernel";
import { SignAccessService } from "../services/sign-access.service";
import { SignDraftRepository } from "../ports/sign-draft.repository";

@Injectable()
export class ListSignTemplatesUseCase {
  constructor(
    private readonly drafts: SignDraftRepository,
    private readonly access: SignAccessService
  ) {}

  async execute(ctx: UseCaseContext, cursor?: string) {
    const { scope } = await this.access.authorize(ctx);
    const rows = await this.drafts.list(
      scope,
      cursor === undefined ? null : SignTemplateIdSchema.parse(cursor)
    );
    const items = rows.slice(0, 25);
    return { items, nextCursor: rows.length > 25 ? items[24].templateId : null };
  }
}
