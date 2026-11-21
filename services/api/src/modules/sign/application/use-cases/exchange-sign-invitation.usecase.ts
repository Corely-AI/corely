import { Inject, Injectable } from "@nestjs/common";
import { UNIT_OF_WORK, type UnitOfWorkPort } from "@corely/kernel";
import { hash } from "../../domain/digest";
import { InvitationSecrets } from "../ports/invitation-secrets";
import { CeremonyRepository } from "../ports/ceremony.repository";
import { RecipientSessionAccessService } from "../services/recipient-session-access.service";

@Injectable()
export class ExchangeSignInvitationUseCase {
  constructor(
    private readonly secrets: InvitationSecrets,
    private readonly repo: CeremonyRepository,
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWorkPort,
    private readonly sessions: RecipientSessionAccessService
  ) {}

  execute(token: string) {
    return this.uow.withinTransaction(async (tx) => {
      const { ref, s, c } = await this.sessions.requireSigner(token, "tokenDigest", tx),
        session = this.secrets.secret(),
        until = new Date(Math.min(+c.expiresAt, Date.now() + 1800000));
      await this.repo.updateSigner(
        ref,
        s.id,
        { sessionDigest: hash(session), sessionUntil: until },
        tx
      );
      return { session, until };
    });
  }
}
