import { Injectable } from "@nestjs/common";
import type { UseCaseContext } from "@corely/kernel";
import { TemplateDocuments } from "../../../documents/public";
import { TemplateDraftAccessService } from "../services/template-draft-access.service";

@Injectable()
export class ReadSignTemplateSourceUseCase {
  constructor(
    private readonly documents: TemplateDocuments,
    private readonly sourceAccess: TemplateDraftAccessService
  ) {}

  async execute(ctx: UseCaseContext, id: string) {
    const bytes = await this.documents.read(await this.sourceAccess.sourceOwner(ctx, id));
    return { base64: bytes?.toString("base64") ?? null };
  }
}
