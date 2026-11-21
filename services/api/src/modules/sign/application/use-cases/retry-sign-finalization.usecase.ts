import { ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { SignTemplateIdSchema } from "@corely/contracts";
import {
  UNIT_OF_WORK,
  AUDIT_PORT,
  OUTBOX_PORT,
  type UnitOfWorkPort,
  type UseCaseContext,
  type AuditPort,
  type OutboxPort,
} from "@corely/kernel";
import { CeremonyRepository } from "../ports/ceremony.repository";
import { SignAccessService } from "../services/sign-access.service";

@Injectable()
export class RetrySignFinalizationUseCase {
  constructor(
    private readonly access: SignAccessService,
    private readonly repo: CeremonyRepository,
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWorkPort,
    @Inject(AUDIT_PORT) private readonly audit: AuditPort,
    @Inject(OUTBOX_PORT) private readonly outbox: OutboxPort
  ) {}

  execute(ctx: UseCaseContext, id: string) {
    return this.uow.withinTransaction(async (tx) => {
      const { scope, userId } = await this.access.authorize(ctx, tx, [
        "sign.requests.send",
        "sign.requests.read",
      ]);
      const ref = { ...scope, requestId: SignTemplateIdSchema.parse(id) };
      await this.repo.lock(ref, tx);
      const draft = await this.repo.draft(ref, tx),
        c = await this.repo.ceremony(ref, tx);
      if (!draft || draft.actorId !== userId || !c) {
        throw new NotFoundException("Request unavailable");
      }
      if (c.status !== "COLLECTED") {
        throw new ConflictException("Request is not awaiting finalization");
      }
      if (!c.finalizationFailed) {
        return;
      }
      await this.repo.change(ref, { finalizationFailed: false }, tx);
      const payload = { workspaceId: scope.workspaceId, requestId: ref.requestId };
      await this.outbox.enqueue(
        { tenantId: scope.tenantId, eventType: "sign.request.collected.v1", payload },
        tx
      );
      await this.audit.log(
        {
          tenantId: scope.tenantId,
          userId,
          entityType: "SignRequest",
          entityId: ref.requestId,
          action: "sign.finalization.retried",
          metadata: payload,
        },
        tx
      );
    });
  }
}
