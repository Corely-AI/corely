import {
  BaseUseCase,
  type LoggerPort,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ValidationError,
  NotFoundError,
  err,
  ok,
} from "@corely/kernel";
import {
  type ListPublicCmsCommentsInput,
  type ListPublicCmsCommentsOutput,
} from "@corely/contracts";
import { type CmsPostRepositoryPort } from "../ports/cms-post-repository.port";
import { type CmsCommentRepositoryPort } from "../ports/cms-comment-repository.port";
import { toCmsCommentDto } from "../mappers/cms.mapper";
import { buildPageInfo } from "../../../../shared/http/pagination";
import { assertPublicModuleEnabled } from "../../../../shared/public";

type Deps = {
  logger: LoggerPort;
  postRepo: CmsPostRepositoryPort;
  commentRepo: CmsCommentRepositoryPort;
};

type ListPublicCmsCommentsParams = ListPublicCmsCommentsInput & { slug: string };

export class ListPublicCmsCommentsUseCase extends BaseUseCase<
  ListPublicCmsCommentsParams,
  ListPublicCmsCommentsOutput
> {
  constructor(private readonly useCaseDeps: Deps) {
    super({ logger: useCaseDeps.logger });
  }

  protected async handle(
    input: ListPublicCmsCommentsParams,
    ctx: UseCaseContext
  ): Promise<Result<ListPublicCmsCommentsOutput, UseCaseError>> {
    const publishError = assertPublicModuleEnabled(ctx, "cms");
    if (publishError) {
      return err(publishError);
    }

    if (!ctx.tenantId || !ctx.workspaceId) {
      return err(new ValidationError("tenantId or workspaceId missing from context"));
    }

    const post = await this.useCaseDeps.postRepo.findBySlug(ctx.tenantId, input.slug, {
      publishedOnly: true,
    });
    if (!post || post.workspaceId !== ctx.workspaceId) {
      return err(new NotFoundError("Post not found"));
    }

    const page = input.page ?? 1;
    const pageSize = input.pageSize ?? 20;

    const { items, total } = await this.useCaseDeps.commentRepo.list({
      tenantId: ctx.tenantId,
      workspaceId: ctx.workspaceId,
      postId: post.id,
      status: "APPROVED",
      page,
      pageSize,
    });

    return ok({
      items: items.map(toCmsCommentDto),
      pageInfo: buildPageInfo(total, page, pageSize),
    });
  }
}
