import { BadRequestException, ConflictException, Inject, Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { SendSignRequestSchema } from "@corely/contracts";
import { UNIT_OF_WORK, type UnitOfWorkPort, type UseCaseContext } from "@corely/kernel";
import { AuthorizeWorkspaceUseCase } from "../../../workspaces/public";
import { CeremonyRepository } from "../ports/ceremony.repository";
import { SignDraftRepository } from "../ports/sign-draft.repository";
import {
  effectiveCeremonyStatus,
  signingProgress,
  validSigningExpiry,
} from "../../domain/signing-lifecycle";
import { hasRequiredSignatures } from "../../domain/template-revision";
import { CeremonyTransitionsService } from "../services/ceremony-transitions.service";
import { InvitationSecrets } from "../ports/invitation-secrets";
import { SignRequestAccessService } from "../services/sign-request-access.service";
import { CoachingSignRequestLinks } from "../../../coaching-engagements/public/sign-request-links";

@Injectable()
export class SendSignRequestUseCase {
  constructor(
    private readonly transitions: CeremonyTransitionsService,
    private readonly secrets: InvitationSecrets,
    private readonly workspaces: AuthorizeWorkspaceUseCase,
    private readonly repo: CeremonyRepository,
    private readonly templates: SignDraftRepository,
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWorkPort,
    private readonly requestAccess: SignRequestAccessService,
    private readonly coachingLinks: CoachingSignRequestLinks
  ) {}

  execute(ctx: UseCaseContext, id: string, body: unknown) {
    const input = SendSignRequestSchema.parse(body);
    return this.uow.withinTransaction(async (tx) => {
      const { ref, draft, userId } = await this.requestAccess.requireOwner(
        ctx,
        id,
        "sign.requests.send",
        tx
      );
      const existing = await this.repo.ceremony(ref, tx),
        expiresAt = new Date(input.expiresAt);
      if (
        input.canonicalSha256 !== draft.canonicalSha256 ||
        (input.draftRevision ?? 0) !== (draft.configuration?.revision ?? 0)
      ) {
        throw new ConflictException("Reload and review the latest request draft");
      }
      if (existing) {
        if (
          existing.consent !== input.consent ||
          existing.invitation !== input.invitation ||
          existing.expiresAt.getTime() !== expiresAt.getTime()
        ) {
          throw new ConflictException("Request already sent with different terms");
        }
        return;
      }
      const settings = draft.configuration?.settings;
      if (
        settings &&
        (settings.consent !== input.consent ||
          settings.invitation !== input.invitation ||
          !settings.expiresAt ||
          new Date(settings.expiresAt).getTime() !== expiresAt.getTime())
      ) {
        throw new ConflictException("Save the request settings before reviewing and sending");
      }
      if (draft.configuration && !hasRequiredSignatures(draft.configuration.layout)) {
        throw new BadRequestException("Place a required signature field for every signer");
      }
      if (draft.configuration && (await this.coachingLinks.hasLink(ref, tx))) {
        throw new ConflictException("Send the coaching agreement from its published template");
      }
      this.secrets.publicOrigin();
      const now = new Date();
      if (!validSigningExpiry(expiresAt, now)) {
        throw new BadRequestException("Expiry must be within 90 days");
      }
      await this.templates.lock(
        { tenantId: ref.tenantId, workspaceId: ref.workspaceId },
        draft.templateId,
        tx
      );
      const latest = await this.templates.latest(
        { tenantId: ref.tenantId, workspaceId: ref.workspaceId },
        draft.templateId,
        tx
      );
      if (!latest || latest.archived) {
        throw new ConflictException("Template archived");
      }
      const sender = await this.workspaces.execute(
        { tenantId: ref.tenantId, workspaceId: ref.workspaceId, userId },
        tx
      );
      if (draft.replacesRequestId) {
        if (!input.confirmReplacement) {
          throw new BadRequestException("Confirm sending this replacement request");
        }
        const { ref: originalRef } = await this.requestAccess.requireOwner(
          ctx,
          draft.replacesRequestId,
          "sign.requests.send",
          tx
        );
        const original = await this.repo.ceremony(originalRef, tx);
        const status = effectiveCeremonyStatus(original, now);
        if (!["SENT", "EXPIRED", "VOID", "DECLINED"].includes(status)) {
          throw new ConflictException("The original request can no longer be replaced");
        }
        if (status === "SENT" || (status === "EXPIRED" && original?.status === "SENT")) {
          await this.transitions.terminate(
            originalRef,
            status === "SENT" ? "VOID" : "EXPIRED",
            userId,
            tx
          );
        }
      }
      await this.repo.create(
        {
          ...ref,
          expiresAt,
          sentAt: now,
          status: "SENT",
          revision: 1,
          verifiedAt: null,
          senderWorkspace: sender.name,
          consent: input.consent,
          invitation: input.invitation,
          artifactSha256: null,
          evidenceSha256: null,
        },
        draft.recipients.map((r, position) => ({ id: randomUUID(), roleId: r.roleId, position })),
        tx
      );
      const rows = await this.repo.signers(ref, tx);
      for (const s of signingProgress(draft.routing, rows).toInvite) {
        await this.transitions.invite(ref, s, userId, tx);
      }
      await this.transitions.recordEvent(ref, userId, "sign.request.sent.v1", tx, {
        ...(draft.configuration ? { draftRevision: String(draft.configuration.revision) } : {}),
        ...(draft.replacesRequestId ? { replacesRequestId: draft.replacesRequestId } : {}),
      });
    });
  }
}
