import { Inject, Injectable } from "@nestjs/common";
import { UNIT_OF_WORK, type UnitOfWorkPort, type UseCaseContext } from "@corely/kernel";
import { CeremonyRepository } from "../ports/ceremony.repository";
import { effectiveCeremonyStatus } from "../../domain/signing-lifecycle";
import { SignRequestAccessService } from "../services/sign-request-access.service";

@Injectable()
export class GetSignRequestProgressUseCase {
  constructor(
    private readonly repo: CeremonyRepository,
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWorkPort,
    private readonly requestAccess: SignRequestAccessService
  ) {}

  execute(ctx: UseCaseContext, id: string) {
    return this.uow.withinTransaction(async (tx) => {
      const { ref } = await this.requestAccess.requireOwner(ctx, id, "sign.requests.read", tx),
        c = await this.repo.ceremony(ref, tx);
      const signers = c ? await this.repo.signers(ref, tx) : [];
      return {
        sentAt: c?.sentAt.toISOString() ?? null,
        verifiedAt: c?.verifiedAt?.toISOString() ?? null,
        finalizationFailed: c?.finalizationFailed ?? false,
        status: effectiveCeremonyStatus(c, new Date()),
        expiresAt: c?.expiresAt.toISOString() ?? null,
        recipients: signers.map((s) => ({
          roleId: s.roleId,
          status: s.status,
          deliveredAt: s.deliveredAt?.toISOString() ?? null,
          acceptedAt: s.acceptedAt?.toISOString() ?? null,
        })),
      };
    });
  }
}
