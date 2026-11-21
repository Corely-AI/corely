import { Injectable } from "@nestjs/common";
import { type UseCaseContext } from "@corely/kernel";
import { TemplateDraftAccessService } from "../services/template-draft-access.service";

@Injectable()
export class GetSignTemplateUseCase {
  constructor(private readonly templateAccess: TemplateDraftAccessService) {}

  async execute(ctx: UseCaseContext, id: string) {
    return (await this.templateAccess.requireDraft(ctx, id)).draft;
  }
}
