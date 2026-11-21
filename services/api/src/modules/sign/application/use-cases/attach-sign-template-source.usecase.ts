import { TemplatePdfInspector } from "../ports/template-pdf-inspector";
import { BadRequestException, ConflictException, Injectable } from "@nestjs/common";
import { createHash } from "node:crypto";
import type { UseCaseContext } from "@corely/kernel";
import { UploadDraftPdfSchema } from "@corely/contracts";
import { TemplateDocuments } from "../../../documents/public";
import { TemplateDraftAccessService } from "../services/template-draft-access.service";

@Injectable()
export class AttachSignTemplateSourceUseCase {
  constructor(
    private readonly documents: TemplateDocuments,
    private readonly inspector: TemplatePdfInspector,
    private readonly sourceAccess: TemplateDraftAccessService
  ) {}

  async execute(ctx: UseCaseContext, id: string, input: unknown) {
    const owner = await this.sourceAccess.sourceOwner(ctx, id);
    if (owner.archived) {
      throw new ConflictException("Template is archived.");
    }
    const { base64 } = UploadDraftPdfSchema.parse(input);
    const bytes = Buffer.from(base64, "base64");
    if (
      bytes.toString("base64") !== base64 ||
      bytes.length > 10 * 1024 * 1024 ||
      !bytes.subarray(0, 5).equals(Buffer.from("%PDF-"))
    ) {
      throw new BadRequestException("Choose a PDF of at most 10 MiB.");
    }
    if (createHash("sha256").update(bytes).digest("hex") !== owner.sha256) {
      throw new ConflictException("PDF differs from the saved draft.");
    }
    let count: number;
    try {
      count = await this.inspector.pageCount(bytes);
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : "Invalid PDF");
    }
    if (count !== owner.pageCount) {
      throw new BadRequestException("PDF page count differs from the draft.");
    }
    await this.documents.store(owner, bytes);
    return { sha256: owner.sha256 };
  }
}
