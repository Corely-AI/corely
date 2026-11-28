import { randomUUID } from "node:crypto";
import { BadRequestException, ConflictException, Inject, Injectable } from "@nestjs/common";
import { UpdateSignRequestDraftSchema } from "@corely/contracts";
import {
  AUDIT_PORT,
  UNIT_OF_WORK,
  type AuditPort,
  type UnitOfWorkPort,
  type UseCaseContext,
} from "@corely/kernel";
import { hash } from "../../domain/digest";
import { recipientsMatchRoles } from "../../domain/recipient-roles";
import { effectiveCeremonyStatus, validSigningExpiry } from "../../domain/signing-lifecycle";
import { CeremonyRepository } from "../ports/ceremony.repository";
import { RequestDraftRepository } from "../ports/request-draft.repository";
import { SignDraftRepository } from "../ports/sign-draft.repository";
import { requestLayout } from "../services/request-layout";
import { SignRequestAccessService } from "../services/sign-request-access.service";
import { CoachingSignRequestLinks } from "../../../coaching-engagements/public/sign-request-links";

@Injectable()
export class EditSignRequestDraftUseCase {
  constructor(
    private readonly access: SignRequestAccessService,
    private readonly requests: RequestDraftRepository,
    private readonly ceremonies: CeremonyRepository,
    private readonly templates: SignDraftRepository,
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWorkPort,
    @Inject(AUDIT_PORT) private readonly audit: AuditPort,
    private readonly coachingLinks: CoachingSignRequestLinks
  ) {}

  update(ctx: UseCaseContext, id: string, body: unknown) {
    const input = UpdateSignRequestDraftSchema.parse(body);
    return this.uow.withinTransaction(async (tx) => {
      const {
        ref,
        draft: { actorId, ...draft },
        userId,
      } = await this.access.requireOwner(
        ctx,
        id,
        ["sign.requests.create", "sign.requests.read"],
        tx
      );
      if (await this.ceremonies.ceremony(ref, tx)) {
        throw new ConflictException("Only an unsent draft can be edited");
      }
      if (await this.coachingLinks.hasLink(ref, tx)) {
        throw new ConflictException(
          "Edit recipients and fields through the originating coaching workflow"
        );
      }
      const { tenantId, workspaceId } = ref;
      const owner = { tenantId, workspaceId, actorId };
      const current = draft.configuration?.revision ?? 0;
      if (input.expectedRevision !== current) {
        if (
          current === input.expectedRevision + 1 &&
          draft.routing === input.routing &&
          JSON.stringify(draft.recipients) === JSON.stringify(input.recipients) &&
          JSON.stringify(draft.configuration?.layout) === JSON.stringify(input.layout) &&
          JSON.stringify(draft.configuration?.settings) === JSON.stringify(input.settings)
        ) {
          return draft;
        }
        throw new ConflictException(
          "This draft was edited elsewhere. Reload to review the latest version."
        );
      }
      const layout = await requestLayout(this.templates, owner, draft, tx);
      if (!layout || JSON.stringify(layout.document) !== JSON.stringify(input.layout.document)) {
        throw new BadRequestException("Keep the original request document when editing fields");
      }
      if (!recipientsMatchRoles(input.layout, input)) {
        throw new BadRequestException("Assign exactly one recipient to every signer role");
      }
      if (
        input.settings.expiresAt &&
        !validSigningExpiry(new Date(input.settings.expiresAt), new Date())
      ) {
        throw new BadRequestException("Expiry must be in the next 90 days");
      }
      const saved = await this.requests.update(owner, ref.requestId, input, tx);
      await this.audit.log(
        {
          tenantId,
          userId,
          entityType: "SignRequest",
          entityId: ref.requestId,
          action: "sign.request.draft_updated",
          metadata: { workspaceId, draftRevision: current + 1 },
        },
        tx
      );
      return saved;
    });
  }

  replace(ctx: UseCaseContext, id: string) {
    return this.uow.withinTransaction(async (tx) => {
      const { ref, draft, userId } = await this.access.requireOwner(
        ctx,
        id,
        ["sign.requests.create", "sign.requests.read"],
        tx
      );
      const ceremony = await this.ceremonies.ceremony(ref, tx);
      if (await this.coachingLinks.hasLink(ref, tx)) {
        throw new ConflictException(
          "Replace this agreement through the originating coaching workflow"
        );
      }
      const now = new Date();
      const status = effectiveCeremonyStatus(ceremony, now);
      if (!ceremony || !["SENT", "EXPIRED", "VOID", "DECLINED"].includes(status)) {
        throw new ConflictException(
          "Only a sent, expired, voided, or declined request can be replaced"
        );
      }
      const { tenantId, workspaceId } = ref;
      const owner = { tenantId, workspaceId, actorId: userId };
      const previous = await this.requests.replacement(owner, ref.requestId, tx);
      if (previous) {
        return previous;
      }
      const layout = await requestLayout(this.templates, owner, draft, tx);
      if (!layout) {
        throw new ConflictException("Request layout is unavailable");
      }
      const replacement = await this.requests.create(
        owner,
        randomUUID(),
        randomUUID(),
        hash("replacement:" + ref.requestId),
        {
          templateId: draft.templateId,
          templateRevision: draft.templateRevision,
          recipients: draft.recipients,
          routing: draft.routing,
        },
        tx,
        {
          requestId: ref.requestId,
          configuration: {
            revision: 1,
            layout,
            settings: {
              expiresAt: null,
              consent: ceremony.consent,
              invitation: ceremony.invitation,
            },
          },
        }
      );
      await this.audit.log(
        {
          tenantId,
          userId,
          entityType: "SignRequest",
          entityId: replacement.requestId,
          action: "sign.request.replacement_prepared",
          metadata: { workspaceId, replacesRequestId: ref.requestId },
        },
        tx
      );
      return replacement;
    });
  }
}
