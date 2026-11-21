import { Inject, Injectable } from "@nestjs/common";
import { UNIT_OF_WORK, type UnitOfWorkPort } from "@corely/kernel";
import { CeremonyRepository } from "../ports/ceremony.repository";
import { CeremonyTransitionsService } from "../services/ceremony-transitions.service";

@Injectable()
export class ExpireSignRequestsUseCase {
  constructor(
    private readonly transitions: CeremonyTransitionsService,
    private readonly repo: CeremonyRepository,
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWorkPort
  ) {}

  async execute() {
    await this.repo.clearExpiredSessions(new Date());
    for (const ref of await this.repo.expired(new Date())) {
      await this.uow.withinTransaction(async (tx) => {
        await this.repo.lock(ref, tx);
        const c = await this.repo.ceremony(ref, tx);
        if (c?.status === "SENT" && c.expiresAt <= new Date()) {
          await this.transitions.terminate(ref, "EXPIRED", "system", tx);
        }
      });
    }
  }
}
