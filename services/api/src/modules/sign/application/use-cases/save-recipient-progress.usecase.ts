import { requestLayout } from "../services/request-layout";
import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { SignValuesSchema } from "@corely/contracts";
import { UNIT_OF_WORK, type UnitOfWorkPort } from "@corely/kernel";
import { validateRecipientValues } from "../../domain/ceremony";
import { CeremonyRepository } from "../ports/ceremony.repository";
import { SignDraftRepository } from "../ports/sign-draft.repository";
import { RecipientSessionAccessService } from "../services/recipient-session-access.service";

@Injectable()
export class SaveRecipientProgressUseCase {
  constructor(
    private readonly repo: CeremonyRepository,
    private readonly templates: SignDraftRepository,
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWorkPort,
    private readonly sessions: RecipientSessionAccessService
  ) {}

  execute(session: string, body: unknown) {
    const values = SignValuesSchema.parse(body);
    return this.uow.withinTransaction(async (tx) => {
      const { ref, s, draft } = await this.sessions.requireSigner(session, "sessionDigest", tx);
      const layout = await requestLayout(this.templates, ref, draft, tx);
      if (!layout || !validateRecipientValues(layout, s.roleId, values, true)) {
        throw new BadRequestException("Invalid assigned fields");
      }
      await this.repo.updateSigner(ref, s.id, { values }, tx);
    });
  }
}
