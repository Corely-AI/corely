import {
  BaseUseCase,
  type LoggerPort,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ValidationError,
  ConflictError,
  err,
  ok,
  type ClockPort,
  type IdGeneratorPort,
} from "@corely/kernel";
import { type CreateCmsPostInput, type CreateCmsPostOutput } from "@corely/contracts";
import { CmsPostEntity } from "../../domain/cms-post.entity";
import { type CmsPostRepositoryPort } from "../ports/cms-post-repository.port";
import { type CmsContentRenderer } from "../services/cms-content-renderer.service";
import { toCmsPostDto } from "../mappers/cms.mapper";

type Deps = {
  logger: LoggerPort;
  postRepo: CmsPostRepositoryPort;
  idGenerator: IdGeneratorPort;
  clock: ClockPort;
  contentRenderer: CmsContentRenderer;
};

export class CreateCmsPostUseCase extends BaseUseCase<CreateCmsPostInput, CreateCmsPostOutput> {
  constructor(private readonly useCaseDeps: Deps) {
    super({ logger: useCaseDeps.logger });
  }

  protected validate(input: CreateCmsPostInput): CreateCmsPostInput {
    if (!input.title?.trim()) {
      throw new ValidationError("title is required");
    }
    if (!input.slug?.trim()) {
      throw new ValidationError("slug is required");
    }
    return input;
  }

  protected async handle(
    input: CreateCmsPostInput,
    ctx: UseCaseContext
  ): Promise<Result<CreateCmsPostOutput, UseCaseError>> {
    if (!ctx.tenantId || !ctx.workspaceId) {
      return err(new ValidationError("tenantId or workspaceId missing from context"));
    }

    const existing = await this.useCaseDeps.postRepo.findBySlug(ctx.tenantId, input.slug.trim());
    if (existing) {
      return err(new ConflictError("slug already exists"));
    }

    const now = this.useCaseDeps.clock.now();
    const status = input.status ?? "DRAFT";
    const rendered = this.useCaseDeps.contentRenderer.render({ type: "doc", content: [] });

    const post = CmsPostEntity.create({
      id: this.useCaseDeps.idGenerator.newId(),
      tenantId: ctx.tenantId,
      workspaceId: ctx.workspaceId,
      status,
      slug: input.slug.trim(),
      title: input.title.trim(),
      excerpt: input.excerpt ?? null,
      coverImageFileId: input.coverImageFileId ?? null,
      tags: input.tags ?? [],
      contentJson: { type: "doc", content: [] },
      contentHtml: rendered.html,
      contentText: rendered.text,
      publishedAt: status === "PUBLISHED" ? now : null,
      authorUserId: ctx.userId ?? "system",
      createdAt: now,
    });

    await this.useCaseDeps.postRepo.create(post);

    return ok({ post: toCmsPostDto(post) });
  }
}
