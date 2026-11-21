import { Injectable } from "@nestjs/common";
import { SignRequestFilterSchema, SignTemplateIdSchema } from "@corely/contracts";
import { type UseCaseContext } from "@corely/kernel";
import { SignAccessService } from "../services/sign-access.service";
import { RequestDraftRepository } from "../ports/request-draft.repository";

@Injectable()
export class ListSignRequestsUseCase {
  constructor(
    private readonly access: SignAccessService,
    private readonly requests: RequestDraftRepository
  ) {}

  async execute(ctx: UseCaseContext, cursor?: string, filters: unknown = {}) {
    const { scope, userId } = await this.access.authorize(ctx, undefined, ["sign.requests.read"]);
    const rows = await this.requests.list(
      { ...scope, actorId: userId },
      SignTemplateIdSchema.optional().parse(cursor),
      SignRequestFilterSchema.parse(filters)
    );
    const items = rows.slice(0, 25);
    return { items, nextCursor: rows.length > 25 ? items[24].requestId : null };
  }
}
