import { Inject, Injectable } from "@nestjs/common";
import { UNIT_OF_WORK, type UnitOfWorkPort, type EmailSenderPort } from "@corely/kernel";
import { CeremonyRepository } from "../ports/ceremony.repository";
import { TenantEntitlementService } from "../../../platform/public";
import { requestRefOf } from "../../domain/ceremony";
import { effectiveCeremonyStatus } from "../../domain/signing-lifecycle";
import { InvitationSecrets } from "../ports/invitation-secrets";

@Injectable()
export class DeliverSignInvitationUseCase {
  constructor(
    private readonly secrets: InvitationSecrets,
    private readonly repo: CeremonyRepository,
    private readonly entitlement: TenantEntitlementService,
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWorkPort
  ) {}

  async execute(
    event: {
      tenantId: string;
      workspaceId: string;
      requestId: string;
      recipientId: string;
      deliveryId: string;
      digest: string;
    },
    sender: EmailSenderPort
  ) {
    const ref = requestRefOf(event);
    const mail = await this.uow.withinTransaction(async (tx) => {
      await this.repo.lock(ref, tx);
      const c = await this.repo.ceremony(ref, tx),
        s = (await this.repo.signers(ref, tx)).find((r) => r.id === event.recipientId);
      if (
        !c ||
        !s ||
        effectiveCeremonyStatus(c, new Date()) !== "SENT" ||
        s.status !== "INVITED" ||
        s.tokenDigest !== event.digest ||
        !s.envelope ||
        !(await this.entitlement.isAppEnabled(ref.tenantId, "sign", tx))
      ) {
        return;
      }
      const draft = await this.repo.draft(ref, tx);
      if (!draft) {
        throw new Error("Missing request");
      }
      return {
        to: [draft.recipients[s.position].email],
        subject: "Signature requested",
        tenantId: ref.tenantId,
        idempotencyKey: event.deliveryId,
        text: [
          c.invitation,
          this.secrets.publicOrigin() +
            "/sign/receive#" +
            this.secrets.openInvitation(s.envelope, s.id),
        ].join("\n\n"),
      };
    });
    if (!mail) {
      return;
    }
    try {
      await sender.sendEmail(mail);
    } catch {
      throw new Error("Signing invitation delivery failed");
    }
    await this.uow.withinTransaction(async (tx) => {
      await this.repo.lock(ref, tx);
      const s = (await this.repo.signers(ref, tx)).find((r) => r.id === event.recipientId);
      if (s?.tokenDigest === event.digest) {
        await this.repo.updateSigner(ref, s.id, { envelope: null, deliveredAt: new Date() }, tx);
      }
    });
  }
}
