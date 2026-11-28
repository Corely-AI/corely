import { requestLayout } from "../services/request-layout";
import { ConflictException, ForbiddenException, Inject, Injectable } from "@nestjs/common";
import { SignValuesSchema } from "@corely/contracts";
import { UNIT_OF_WORK, type UnitOfWorkPort } from "@corely/kernel";
import { TemplateDocuments } from "../../../documents/public";
import { SignDraftRepository } from "../ports/sign-draft.repository";
import { RecipientSessionAccessService } from "../services/recipient-session-access.service";
import { signingReviewDigest } from "../../domain/signing-review-digest";

@Injectable()
export class ReviewSignRequestUseCase {
  constructor(
    private readonly templates: SignDraftRepository,
    private readonly documents: TemplateDocuments,
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWorkPort,
    private readonly sessions: RecipientSessionAccessService
  ) {}

  async execute(session: string) {
    const view = await this.uow.withinTransaction(async (tx) => {
      const { ref, s, c, draft } = await this.sessions.requireSigner(session, "sessionDigest", tx);
      const layout = await requestLayout(this.templates, ref, draft, tx);
      if (!layout) {
        throw new ForbiddenException("Signing access unavailable");
      }
      return {
        senderWorkspace: c.senderWorkspace,
        saved: SignValuesSchema.parse(s.values ?? []),
        owner: { ...ref, templateId: draft.templateId, sha256: draft.canonicalSha256 },
        title: draft.title,
        role: s.roleId,
        fields: layout.fields.filter((f) => f.roleId === s.roleId),
        consent: c.consent,
        review: signingReviewDigest(c, s, draft.canonicalSha256),
      };
    });
    const { owner, ...content } = view;
    const bytes = await this.documents.read(owner);
    if (!bytes) {
      throw new ConflictException("Source unavailable");
    }
    return { ...content, pdf: bytes.toString("base64") };
  }
}
