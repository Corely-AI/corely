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
import { type GetPublicCmsPostInput, type GetPublicCmsPostOutput } from "@corely/contracts";
import { type CmsPostRepositoryPort } from "../ports/cms-post-repository.port";
import { toCmsPublicPostDto } from "../mappers/cms.mapper";
import { assertPublicModuleEnabled } from "../../../../shared/public";

type Deps = {
  logger: LoggerPort;
  postRepo: CmsPostRepositoryPort;
};

export class GetPublicCmsPostUseCase extends BaseUseCase<
  GetPublicCmsPostInput,
  GetPublicCmsPostOutput
> {
  constructor(private readonly useCaseDeps: Deps) {
    super({ logger: useCaseDeps.logger });
  }

  protected async handle(
    input: GetPublicCmsPostInput,
    ctx: UseCaseContext
  ): Promise<Result<GetPublicCmsPostOutput, UseCaseError>> {
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

    return ok({ post: toCmsPublicPostDto(post) });
  }
}
