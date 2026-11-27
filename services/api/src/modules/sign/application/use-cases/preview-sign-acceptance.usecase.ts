import { requestLayout } from "../services/request-layout";
import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { ReviewSignValuesSchema } from "@corely/contracts";
import { UNIT_OF_WORK, type UnitOfWorkPort } from "@corely/kernel";
import { TemplateDocuments } from "../../../documents/public";
import { validateRecipientValues } from "../../domain/ceremony";
import { InvitationSecrets } from "../ports/invitation-secrets";
import { SignArtifactEngine } from "../ports/sign-artifact-engine";
import { SignDraftRepository } from "../ports/sign-draft.repository";
import { RecipientSessionAccessService } from "../services/recipient-session-access.service";
import { signingReviewDigest } from "../../domain/signing-review-digest";

@Injectable()
export class PreviewSignAcceptanceUseCase {
  constructor(
    private readonly engine: SignArtifactEngine,
    private readonly secrets: InvitationSecrets,
    private readonly templates: SignDraftRepository,
    private readonly documents: TemplateDocuments,
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWorkPort,
    private readonly sessions: RecipientSessionAccessService
  ) {}

  async execute(session: string, body: unknown) {
    const input = ReviewSignValuesSchema.parse(body);
    const snapshot = await this.uow.withinTransaction(async (tx) => {
      const { ref, s, c, draft } = await this.sessions.requireSigner(session, "sessionDigest", tx);
      const scope = { tenantId: ref.tenantId, workspaceId: ref.workspaceId },
        layout = await requestLayout(this.templates, scope, draft, tx);
      if (
        !layout ||
        input.review !== signingReviewDigest(c, s, draft.canonicalSha256) ||
        !validateRecipientValues(layout, s.roleId, input.values)
      ) {
        throw new BadRequestException("Complete your assigned fields before reviewing");
      }
      return {
        owner: { ...scope, templateId: draft.templateId, sha256: draft.canonicalSha256 },
        layout,
        role: s.roleId,
      };
    });
    const source = await this.documents.read(snapshot.owner);
    if (!source) {
      throw new NotFoundException("Document unavailable");
    }
    const preview = await this.engine.preview(source, snapshot.layout, snapshot.role, input.values);
    return {
      pdf: preview.toString("base64"),
      confirmation: this.secrets.confirmPreview(session, input.review, input.values),
    };
  }
}
