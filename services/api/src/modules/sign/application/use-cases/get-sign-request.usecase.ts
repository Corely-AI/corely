import { Injectable, NotFoundException } from "@nestjs/common";
import { SignTemplateIdSchema } from "@corely/contracts";
import { type UseCaseContext } from "@corely/kernel";
import { SignAccessService } from "../services/sign-access.service";
import { RequestDraftRepository } from "../ports/request-draft.repository";
import { CoachingSignRequestLinks } from "../../../coaching-engagements/public/sign-request-links";

@Injectable()
export class GetSignRequestUseCase {
  constructor(
    private readonly access: SignAccessService,
    private readonly requests: RequestDraftRepository,
    private readonly coachingLinks: CoachingSignRequestLinks
  ) {}

  async execute(ctx: UseCaseContext, id: string) {
    const { scope, userId } = await this.access.authorize(ctx, undefined, ["sign.requests.read"]);
    const draft = await this.requests.get(
      { ...scope, actorId: userId },
      SignTemplateIdSchema.parse(id)
    );
    if (!draft) {
      throw new NotFoundException("Request draft not found");
    }
    return (await this.coachingLinks.hasLink({ ...scope, requestId: draft.requestId }))
      ? { ...draft, workflowManaged: true as const }
      : draft;
  }
}
