import { ConflictException, Inject, Injectable } from "@nestjs/common";
import { UNIT_OF_WORK, type UnitOfWorkPort, type UseCaseContext } from "@corely/kernel";
import { CeremonyRepository } from "../ports/ceremony.repository";
import { effectiveCeremonyStatus } from "../../domain/signing-lifecycle";
import { CeremonyTransitionsService } from "../services/ceremony-transitions.service";
import { SignRequestAccessService } from "../services/sign-request-access.service";

@Injectable()
export class VoidSignRequestUseCase {
  constructor(
    private readonly transitions: CeremonyTransitionsService,
    private readonly repo: CeremonyRepository,
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWorkPort,
    private readonly requestAccess: SignRequestAccessService
  ) {}

  execute(ctx: UseCaseContext, id: string) {
    return this.uow.withinTransaction(async (tx) => {
      const { ref, userId } = await this.requestAccess.requireOwner(
          ctx,
          id,
          "sign.requests.send",
          tx
        ),
        c = await this.repo.ceremony(ref, tx);
      if (c?.status === "VOID") {
        return;
      }
      if (effectiveCeremonyStatus(c, new Date()) !== "SENT") {
        throw new ConflictException("Request cannot be voided");
      }
      await this.transitions.terminate(ref, "VOID", userId, tx);
    });
  }
}
