import {
  BaseUseCase,
  type LoggerPort,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ValidationError,
  err,
  ok,
} from "@corely/kernel";
import { type ListCmsCommentsInput, type ListCmsCommentsOutput } from "@corely/contracts";
import { type CmsCommentRepositoryPort } from "../ports/cms-comment-repository.port";
import { toCmsCommentDto } from "../mappers/cms.mapper";
import { buildPageInfo } from "../../../../shared/http/pagination";

type Deps = {
  logger: LoggerPort;
  commentRepo: CmsCommentRepositoryPort;
};

export class ListCmsCommentsUseCase extends BaseUseCase<
  ListCmsCommentsInput,
  ListCmsCommentsOutput
> {
  constructor(private readonly useCaseDeps: Deps) {
    super({ logger: useCaseDeps.logger });
  }

  protected async handle(
    input: ListCmsCommentsInput,
    ctx: UseCaseContext
  ): Promise<Result<ListCmsCommentsOutput, UseCaseError>> {
    if (!ctx.tenantId || !ctx.workspaceId) {
      return err(new ValidationError("tenantId or workspaceId missing from context"));
    }

    const page = input.page ?? 1;
    const pageSize = input.pageSize ?? 20;

    const { items, total } = await this.useCaseDeps.commentRepo.list({
      tenantId: ctx.tenantId,
      workspaceId: ctx.workspaceId,
      postId: input.postId,
      status: input.status,
      page,
      pageSize,
    });

    return ok({
      items: items.map(toCmsCommentDto),
      pageInfo: buildPageInfo(total, page, pageSize),
    });
  }
}
