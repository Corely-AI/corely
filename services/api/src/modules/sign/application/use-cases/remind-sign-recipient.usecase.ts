import { ConflictException, Inject, Injectable } from "@nestjs/common";
import { SignTemplateIdSchema } from "@corely/contracts";
import { UNIT_OF_WORK, type UnitOfWorkPort, type UseCaseContext } from "@corely/kernel";
import { CeremonyRepository } from "../ports/ceremony.repository";
import { effectiveCeremonyStatus } from "../../domain/signing-lifecycle";
import { CeremonyTransitionsService } from "../services/ceremony-transitions.service";
import { SignRequestAccessService } from "../services/sign-request-access.service";

@Injectable()
export class RemindSignRecipientUseCase {
  constructor(
    private readonly transitions: CeremonyTransitionsService,
    private readonly repo: CeremonyRepository,
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWorkPort,
    private readonly requestAccess: SignRequestAccessService
  ) {}

  execute(ctx: UseCaseContext, id: string, roleId: string, key: string) {
    const commandId = SignTemplateIdSchema.parse(key);
    return this.uow.withinTransaction(async (tx) => {
      const { ref, userId } = await this.requestAccess.requireOwner(
        ctx,
        id,
        "sign.requests.send",
        tx
      );
      const claim = await this.repo.claimReminder(ref, commandId, roleId, tx);
      if (claim === "same") {
        return;
      }
      if (claim === "limited") {
        throw new ConflictException("Wait 15 minutes before sending another reminder");
      }
      if (claim === "conflict") {
        throw new ConflictException("Reminder key already used");
      }
      const c = await this.repo.ceremony(ref, tx),
        s = (await this.repo.signers(ref, tx)).find((row) => row.roleId === roleId);
      if (effectiveCeremonyStatus(c, new Date()) !== "SENT" || s?.status !== "INVITED") {
        throw new ConflictException("Recipient cannot be reminded");
      }
      await this.transitions.invite(ref, s, userId, tx);
    });
  }
}
