import { randomUUID } from "node:crypto";
import { Inject, Injectable } from "@nestjs/common";
import {
  AUDIT_PORT,
  OUTBOX_PORT,
  type AuditPort,
  type OutboxPort,
  type TransactionContext,
} from "@corely/kernel";
import type { RequestRef, Signer } from "../../domain/ceremony";
import { hash } from "../../domain/digest";
import { CeremonyRepository } from "../ports/ceremony.repository";
import { InvitationSecrets } from "../ports/invitation-secrets";

@Injectable()
export class CeremonyTransitionsService {
  constructor(
    private readonly repo: CeremonyRepository,
    private readonly secrets: InvitationSecrets,
    @Inject(AUDIT_PORT) private readonly audit: AuditPort,
    @Inject(OUTBOX_PORT) private readonly outbox: OutboxPort
  ) {}
  async recordEvent(
    ref: RequestRef,
    actor: string,
    event: string,
    tx: TransactionContext,
    extra: Record<string, string> = {}
  ) {
    const metadata = { workspaceId: ref.workspaceId, requestId: ref.requestId, ...extra };
    await this.audit.log(
      {
        tenantId: ref.tenantId,
        userId: actor,
        action: event,
        entityType: "SignRequest",
        entityId: ref.requestId,
        metadata,
      },
      tx
    );
    await this.outbox.enqueue({ tenantId: ref.tenantId, eventType: event, payload: metadata }, tx);
  }
  async invite(ref: RequestRef, s: Signer, actor: string, tx: TransactionContext) {
    const token = this.secrets.secret(),
      digest = hash(token);
    await this.repo.updateSigner(
      ref,
      s.id,
      {
        status: "INVITED",
        tokenDigest: digest,
        envelope: this.secrets.sealInvitation(token, s.id),
        sessionDigest: null,
        sessionUntil: null,
        deliveredAt: null,
      },
      tx
    );
    await this.recordEvent(ref, actor, "sign.invitation.requested.v1", tx, {
      recipientId: s.id,
      deliveryId: randomUUID(),
      digest,
    });
  }
  async terminate(
    ref: RequestRef,
    status: "VOID" | "DECLINED" | "EXPIRED",
    actor: string,
    tx: TransactionContext
  ) {
    await this.repo.change(ref, { status }, tx);
    for (const row of await this.repo.signers(ref, tx)) {
      await this.repo.updateSigner(
        ref,
        row.id,
        {
          tokenDigest: null,
          sessionDigest: null,
          envelope: null,
          sessionUntil: null,
          ...(row.status === "ACCEPTED" ? {} : { values: [] }),
        },
        tx
      );
    }
    await this.recordEvent(ref, actor, "sign.request.closed.v1", tx, { status });
  }
}
