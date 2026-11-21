import { Injectable, NotFoundException } from "@nestjs/common";
import { SignTemplateIdSchema } from "@corely/contracts";
import { type TransactionContext, type UseCaseContext } from "@corely/kernel";
import { SignAccessService } from "./sign-access.service";
import { CeremonyRepository } from "../ports/ceremony.repository";

@Injectable()
export class SignRequestAccessService {
  constructor(
    private readonly access: SignAccessService,
    private readonly repo: CeremonyRepository
  ) {}

  async requireOwner(ctx: UseCaseContext, id: string, perm: string, tx: TransactionContext) {
    const { scope, userId } = await this.access.authorize(ctx, tx, [perm]);
    const ref = { ...scope, requestId: SignTemplateIdSchema.parse(id) };
    await this.repo.lock(ref, tx);
    const draft = await this.repo.draft(ref, tx);
    if (!draft || draft.actorId !== userId) {
      throw new NotFoundException("Request not found");
    }
    return { ref, draft, userId };
  }
}
