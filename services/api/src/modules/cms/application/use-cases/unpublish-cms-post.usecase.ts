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
  type ClockPort,
} from "@corely/kernel";
import { type CmsPostDto } from "@corely/contracts";
import { type CmsPostRepositoryPort } from "../ports/cms-post-repository.port";
import { toCmsPostDto } from "../mappers/cms.mapper";

type Deps = {
  logger: LoggerPort;
  postRepo: CmsPostRepositoryPort;
  clock: ClockPort;
};

type UnpublishCmsPostParams = { postId: string };

export class UnpublishCmsPostUseCase extends BaseUseCase<
  UnpublishCmsPostParams,
  { post: CmsPostDto }
> {
  constructor(private readonly useCaseDeps: Deps) {
    super({ logger: useCaseDeps.logger });
  }

  protected async handle(
    input: UnpublishCmsPostParams,
    ctx: UseCaseContext
  ): Promise<Result<{ post: CmsPostDto }, UseCaseError>> {
    if (!ctx.tenantId || !ctx.workspaceId) {
      return err(new ValidationError("tenantId or workspaceId missing from context"));
    }

    const post = await this.useCaseDeps.postRepo.findById(ctx.tenantId, input.postId);
    if (!post || post.workspaceId !== ctx.workspaceId) {
      return err(new NotFoundError("Post not found"));
    }

    try {
      post.unpublish(this.useCaseDeps.clock.now());
    } catch (error) {
      return err(new ValidationError(error instanceof Error ? error.message : "Invalid status"));
    }

    await this.useCaseDeps.postRepo.save(post);

    return ok({ post: toCmsPostDto(post) });
  }
}
