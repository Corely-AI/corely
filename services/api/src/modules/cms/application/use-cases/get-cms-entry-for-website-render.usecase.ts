import {
  BaseUseCase,
  type LoggerPort,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ValidationError,
  NotFoundError,
  ok,
  err,
} from "@corely/kernel";
import type { CmsPostRepositoryPort } from "../ports/cms-post-repository.port";

export type GetCmsEntryForWebsiteRenderInput = {
  entryId: string;
  mode: "live" | "preview";
};

export type CmsEntryRenderPayload = {
  entryId: string;
  title: string;
  excerpt: string | null;
  contentJson: unknown;
  contentHtml: string;
  contentText: string;
  status: string;
  updatedAt: string;
  publishedAt: string | null;
};

type Deps = {
  logger: LoggerPort;
  postRepo: CmsPostRepositoryPort;
};

export class GetCmsEntryForWebsiteRenderUseCase extends BaseUseCase<
  GetCmsEntryForWebsiteRenderInput,
  CmsEntryRenderPayload
> {
  constructor(protected readonly deps: Deps) {
    super({ logger: deps.logger });
  }

  protected validate(input: GetCmsEntryForWebsiteRenderInput): GetCmsEntryForWebsiteRenderInput {
    if (!input.entryId?.trim()) {
      throw new ValidationError("entryId is required");
    }
    return input;
  }

  protected async handle(
    input: GetCmsEntryForWebsiteRenderInput,
    ctx: UseCaseContext
  ): Promise<Result<CmsEntryRenderPayload, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId missing from context"));
    }

    const post = await this.deps.postRepo.findById(ctx.tenantId, input.entryId);
    if (!post) {
      return err(new NotFoundError("Entry not found"));
    }

    if (ctx.workspaceId && post.workspaceId !== ctx.workspaceId) {
      return err(new NotFoundError("Entry not found"));
    }

    if (input.mode === "live") {
      if (post.status !== "PUBLISHED" || !post.publishedAt) {
        return err(new NotFoundError("Entry not published"));
      }
    }

    return ok({
      entryId: post.id,
      title: post.title,
      excerpt: post.excerpt ?? null,
      contentJson: post.contentJson,
      contentHtml: post.contentHtml,
      contentText: post.contentText,
      status: post.status,
      updatedAt: post.updatedAt.toISOString(),
      publishedAt: post.publishedAt ? post.publishedAt.toISOString() : null,
    });
  }
}
