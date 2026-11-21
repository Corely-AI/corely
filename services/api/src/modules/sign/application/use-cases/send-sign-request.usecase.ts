import { BadRequestException, ConflictException, Inject, Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { SendSignRequestSchema } from "@corely/contracts";
import { UNIT_OF_WORK, type UnitOfWorkPort, type UseCaseContext } from "@corely/kernel";
import { AuthorizeWorkspaceUseCase } from "../../../workspaces/public";
import { CeremonyRepository } from "../ports/ceremony.repository";
import { SignDraftRepository } from "../ports/sign-draft.repository";
import { signingProgress, validSigningExpiry } from "../../domain/signing-lifecycle";
import { CeremonyTransitionsService } from "../services/ceremony-transitions.service";
import { InvitationSecrets } from "../ports/invitation-secrets";
import { SignRequestAccessService } from "../services/sign-request-access.service";

@Injectable()
export class SendSignRequestUseCase {
  constructor(
    private readonly transitions: CeremonyTransitionsService,
    private readonly secrets: InvitationSecrets,
    private readonly workspaces: AuthorizeWorkspaceUseCase,
    private readonly repo: CeremonyRepository,
    private readonly templates: SignDraftRepository,
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWorkPort,
    private readonly requestAccess: SignRequestAccessService
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
      if (input.canonicalSha256 !== draft.canonicalSha256) {
        throw new ConflictException("Review the published document again");
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
      await this.transitions.recordEvent(ref, userId, "sign.request.sent.v1", tx);
    });
  }
}
