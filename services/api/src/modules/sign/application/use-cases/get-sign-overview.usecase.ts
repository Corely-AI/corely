import { Injectable } from "@nestjs/common";
import type { UseCaseContext } from "@corely/kernel";
import { SignAccessService } from "../services/sign-access.service";
import { RequestDraftRepository } from "../ports/request-draft.repository";

@Injectable()
export class GetSignOverviewUseCase {
  constructor(
    private readonly auth: SignAccessService,
    private readonly requests: RequestDraftRepository
  ) {}

  async execute(ctx: UseCaseContext) {
    const { scope, userId } = await this.auth.authorize(ctx, undefined, ["sign.requests.read"]);
    return this.requests.counts({ ...scope, actorId: userId });
  }
}
