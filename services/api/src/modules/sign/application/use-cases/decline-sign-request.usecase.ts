import { Inject, Injectable } from "@nestjs/common";
import { UNIT_OF_WORK, type UnitOfWorkPort } from "@corely/kernel";
import { CeremonyTransitionsService } from "../services/ceremony-transitions.service";
import { RecipientSessionAccessService } from "../services/recipient-session-access.service";

@Injectable()
export class DeclineSignRequestUseCase {
  constructor(
    private readonly transitions: CeremonyTransitionsService,
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWorkPort,
    private readonly sessions: RecipientSessionAccessService
  ) {}

  execute(session: string) {
    return this.uow.withinTransaction(async (tx) => {
      const { ref, s } = await this.sessions.requireSigner(session, "sessionDigest", tx);
      await this.transitions.terminate(ref, "DECLINED", s.id, tx);
    });
  }
}
