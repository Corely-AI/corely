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
import { type ListPublicCmsPostsInput, type ListPublicCmsPostsOutput } from "@corely/contracts";
import { type CmsPostRepositoryPort } from "../ports/cms-post-repository.port";
import { toCmsPostSummaryDto } from "../mappers/cms.mapper";
import { buildPageInfo } from "../../../../shared/http/pagination";
import { assertPublicModuleEnabled } from "../../../../shared/public";

type Deps = {
  logger: LoggerPort;
  postRepo: CmsPostRepositoryPort;
};

export class ListPublicCmsPostsUseCase extends BaseUseCase<
  ListPublicCmsPostsInput,
  ListPublicCmsPostsOutput
> {
  constructor(private readonly useCaseDeps: Deps) {
    super({ logger: useCaseDeps.logger });
  }

  protected async handle(
    input: ListPublicCmsPostsInput,
    ctx: UseCaseContext
  ): Promise<Result<ListPublicCmsPostsOutput, UseCaseError>> {
    const publishError = assertPublicModuleEnabled(ctx, "cms");
    if (publishError) {
      return err(publishError);
    }

    if (!ctx.tenantId || !ctx.workspaceId) {
      return err(new ValidationError("tenantId or workspaceId missing from context"));
    }

    const page = input.page ?? 1;
    const pageSize = input.pageSize ?? 20;

    const { items, total } = await this.useCaseDeps.postRepo.list({
      tenantId: ctx.tenantId,
      workspaceId: ctx.workspaceId,
      q: input.q,
      page,
      pageSize,
      publishedOnly: true,
    });

    return ok({
      items: items.map(toCmsPostSummaryDto),
      pageInfo: buildPageInfo(total, page, pageSize),
    });
  }
}
